"""Trusted sandbox bootstrap. It never receives expected results or reference solutions."""
import contextlib
import ctypes
import datetime
import io
import json
import math
import os
import resource
import sys

sys.path.insert(0, "/opt/packages")
READY = "DISCERE_PYTHON_READY\n"


def restrict():
    if sys.version_info[:2] != (3, 12) or os.geteuid() == 0:
        raise RuntimeError("The unprivileged Python runtime is unavailable.")
    for kind, maximum in (
        (resource.RLIMIT_AS, 512 * 1024 * 1024),
        (resource.RLIMIT_CPU, 2),
        (resource.RLIMIT_FSIZE, 1024 * 1024),
        (resource.RLIMIT_NOFILE, 32),
        (resource.RLIMIT_CORE, 0),
        (resource.RLIMIT_STACK, 8 * 1024 * 1024),
    ):
        resource.setrlimit(kind, (maximum, maximum))


def prevent_children():
    # Hard limits and seccomp remain in force even if learner code replaces Python objects.
    resource.setrlimit(resource.RLIMIT_NPROC, (0, 0))
    lib = ctypes.CDLL("libseccomp.so.2", use_errno=True)
    lib.seccomp_init.argtypes = [ctypes.c_uint32]
    lib.seccomp_init.restype = ctypes.c_void_p
    lib.seccomp_syscall_resolve_name.argtypes = [ctypes.c_char_p]
    lib.seccomp_syscall_resolve_name.restype = ctypes.c_int
    lib.seccomp_rule_add.argtypes = [ctypes.c_void_p, ctypes.c_uint32, ctypes.c_int, ctypes.c_uint]
    lib.seccomp_rule_add.restype = ctypes.c_int
    lib.seccomp_load.argtypes = [ctypes.c_void_p]
    lib.seccomp_load.restype = ctypes.c_int
    lib.seccomp_release.argtypes = [ctypes.c_void_p]
    lib.seccomp_release.restype = None
    ctx = lib.seccomp_init(0x7FFF0000)  # SCMP_ACT_ALLOW
    if not ctx:
        raise RuntimeError("The syscall boundary is unavailable.")
    try:
        for name in (
            "clone", "clone3", "fork", "vfork", "execve", "execveat",
            "ptrace", "mount", "umount2", "unshare", "setns",
            "bpf", "perf_event_open", "userfaultfd",
            "keyctl", "add_key", "request_key", "kexec_load", "reboot",
        ):
            number = lib.seccomp_syscall_resolve_name(name.encode("ascii"))
            if number < 0:
                if name in ("clone", "execve"):
                    raise RuntimeError("A required syscall rule is unavailable.")
                continue
            if lib.seccomp_rule_add(ctx, 0x00050001, number, 0) != 0:  # SCMP_ACT_ERRNO(EPERM)
                raise RuntimeError("A syscall rule could not be installed.")
        if lib.seccomp_load(ctx) != 0:
            raise RuntimeError("The syscall boundary could not be installed.")
    finally:
        lib.seccomp_release(ctx)


class RunnerGuidance(Exception):
    """Raised by the runner itself, never by learner code: its message is fixed and safe to show."""


class OutputLimit(Exception):
    pass


class CapturedOutput(io.TextIOBase):
    def __init__(self):
        self.parts = []
        self.length = 0

    def write(self, text):
        self.length += len(text)
        if self.length > 8000:
            raise OutputLimit()
        self.parts.append(text)
        return len(text)

    def flush(self):
        pass

    def getvalue(self):
        return "".join(self.parts)


def main():
    try:
        raw = sys.stdin.buffer.read(131073)
        if len(raw) > 131072:
            raise ValueError()
        request = json.loads(raw)
        if set(request) not in ({"code", "inputs"}, {"code", "inputs", "call"}) or not isinstance(request["code"], str):
            raise ValueError()
        restrict()
        import numpy as np
        import pandas as pd
        if np.__version__ != "2.3.5" or pd.__version__ != "3.0.1":
            raise RuntimeError("The reviewed data-analysis package versions are unavailable.")
        prevent_children()
    except BaseException:
        print(json.dumps({"error": "runtime", "message": "Python practice needs its configured isolated runtime."}))
        return

    sys.stderr.write(READY)
    sys.stderr.flush()
    captured = CapturedOutput()
    count = [0]

    def normalize(item, depth=0):
        count[0] += 1
        if count[0] > 2000 or depth > 6:
            raise OutputLimit()
        if item is None or item is pd.NA or item is pd.NaT:
            return None
        if isinstance(item, np.generic):
            return normalize(item.item(), depth)
        if isinstance(item, bool):
            return item
        if isinstance(item, str):
            if len(item) > 2000:
                raise OutputLimit()
            return item
        if isinstance(item, (int, float)):
            if isinstance(item, float) and math.isnan(item):
                return None
            if not math.isfinite(item) or abs(item) > 1e15:
                raise RunnerGuidance("Keep numeric results finite and within the exercise's range.")
            return item
        if isinstance(item, (datetime.datetime, datetime.date, pd.Timestamp)):
            return item.isoformat()
        if isinstance(item, np.ndarray):
            return normalize(item.tolist(), depth)
        if isinstance(item, pd.Series):
            return normalize(item.tolist(), depth)
        if isinstance(item, pd.DataFrame):
            if len(item) > 200 or len(item.columns) > 16:
                raise OutputLimit()
            return normalize({"columns": [str(c) for c in item.columns], "rows": item.values.tolist()}, depth)
        if isinstance(item, (list, tuple)):
            if len(item) > 200:
                raise OutputLimit()
            return [normalize(child, depth + 1) for child in item]
        if isinstance(item, dict):
            if len(item) > 200 or any(not isinstance(k, str) or not 1 <= len(k) <= 120 for k in item):
                raise OutputLimit()
            return {k: normalize(v, depth + 1) for k, v in item.items()}
        raise RunnerGuidance("Assign result a number, text, list, dictionary, NumPy array, Series or DataFrame.")

    try:
        scope = dict(request["inputs"])
        with contextlib.redirect_stdout(captured), contextlib.redirect_stderr(captured):
            exec(compile(request["code"], "<learner>", "exec"), scope, scope)
            if "call" in request:
                call = request["call"]
                function = scope.get(call["name"])
                if not callable(function):
                    raise RunnerGuidance("Define the requested function.")
                result = normalize(function(*(scope[name] for name in call["arguments"])))
            else:
                if "result" not in scope:
                    raise RunnerGuidance("Assign your answer to result.")
                result = normalize(scope["result"])
        payload = {"result": result, "output": captured.getvalue()}
    except (OutputLimit, MemoryError, RecursionError):
        payload = {"error": "limit", "message": "This program exceeded a practice limit. Keep loops, output and results small.", "output": captured.getvalue()}
    except RunnerGuidance as error:
        payload = {"error": "code", "message": str(error), "output": captured.getvalue()}
    except SyntaxError as error:
        payload = {"error": "code", "message": "Syntax error on line " + str(error.lineno) + ": " + str(error.msg)[:200], "output": captured.getvalue()}
    except BaseException as error:
        # Learner exceptions can contain arbitrary paths or messages. Return a type and line,
        # with useful fixed guidance for common errors, without exposing host information.
        kind = type(error).__name__
        line = None
        trace = error.__traceback__
        while trace:
            if trace.tb_frame.f_code.co_filename == "<learner>":
                line = trace.tb_lineno
            trace = trace.tb_next
        guidance = {
            "NameError": "Check variable names and imports.",
            "TypeError": "Check the types passed into this operation.",
            "KeyError": "Check that this key or column exists.",
            "IndexError": "Check the selected position against the collection's length.",
            "ZeroDivisionError": "Handle a zero denominator explicitly.",
            "PermissionError": "This operation is unavailable in a practice program.",
            "FileNotFoundError": "Use the supplied inputs or files you create in /tmp.",
            "ValueError": "Check the operation's inputs and assign the requested answer to result.",
        }.get(kind, "Check the highlighted operation.")
        payload = {"error": "code", "message": kind[:80] + (" on line " + str(line) if line else "") + ". " + guidance, "output": captured.getvalue()}
    try:
        encoded = json.dumps(payload, ensure_ascii=True, allow_nan=False)
        if len(encoded) > 131072:
            raise OutputLimit()
        sys.stdout.write(encoded)
        sys.stdout.flush()
    except BaseException:
        sys.stdout.write('{"error":"limit","message":"The program output exceeded a practice limit."}')


if __name__ == "__main__":
    main()
