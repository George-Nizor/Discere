"""Evaluate only reviewed repository-authored examples, outside the learner runtime.

Usage: python scripts/python-examples.py MANIFEST RESULTS [--verify]
Requires Python 3.12, NumPy 2.3.5 and pandas 3.0.1 for reproducible fixtures.
This is an authoring utility, not an execution sandbox or an API endpoint.
"""
import contextlib
import hashlib
import io
import json
import math
import platform
import sys
import types
from pathlib import Path
import numpy as np
import pandas as pd


def cell(value):
    if value is None or value is pd.NA or value is pd.NaT:
        return None
    if isinstance(value, np.generic):
        value = value.item()
    if isinstance(value, float) and not math.isfinite(value):
        return None if math.isnan(value) else str(value)
    if isinstance(value, (str, int, float, bool)):
        return value
    return str(value)


def watched(name, value):
    typename = type(value).__name__
    if isinstance(value, (set, frozenset)):
        display = repr(sorted(value, key=repr))
        display = ("set(" if isinstance(value, set) else "frozenset(") + display + ")"
    elif isinstance(value, types.FunctionType):
        display = "function " + value.__name__
    elif isinstance(value, types.ModuleType):
        display = "module " + value.__name__
    else:
        display = repr(value)
    result = {"name": name, "type": typename, "display": display}
    if isinstance(value, pd.Series):
        result["table"] = {
            "columns": ["index", str(value.name) if value.name is not None else "value"],
            "rows": [[cell(index), cell(item)] for index, item in value.items()],
        }
    elif isinstance(value, pd.DataFrame):
        result["table"] = {
            "columns": ["index", *map(str, value.columns)],
            "rows": [[cell(index), *map(cell, row)] for index, row in zip(value.index, value.itertuples(index=False, name=None))],
        }
    elif isinstance(value, np.ndarray) and value.ndim == 2:
        result["table"] = {
            "columns": ["row", *[str(i) for i in range(value.shape[1])]],
            "rows": [[i, *map(cell, row)] for i, row in enumerate(value)],
        }
    if len(display) > 2000:
        raise ValueError("Watched value too large: " + name)
    if "table" in result and (len(result["table"]["rows"]) > 24 or len(result["table"]["columns"]) > 9):
        raise ValueError("Teaching table too large: " + name)
    return result


def execute(example):
    namespace = {"__name__": "__discere_example__"}
    output = io.StringIO()
    steps = []
    line = 1
    for chunk in example["chunks"]:
        with contextlib.redirect_stdout(output):
            exec(compile(chunk, "<authored-example>", "exec"), namespace)
        end = line + len(chunk.split("\n")) - 1
        steps.append({
            "lineStart": line, "lineEnd": end,
            "values": [watched(name, namespace[name]) for name in example["watch"] if name in namespace],
            "stdout": output.getvalue(),
        })
        line = end + 1
    return {"id": example["id"], "label": example["label"], "code": "\n".join(example["chunks"]), "steps": steps}


def main():
    manifest_path, result_path = map(Path, sys.argv[1:3])
    raw = manifest_path.read_bytes()
    manifest = json.loads(raw)
    diagrams = {}
    for key, examples in manifest["examples"].items():
        diagrams[key] = {
            "type": "python_execution",
            "runtime": "Python 3.12" + (" · NumPy 2.3" if any("numpy" in "\n".join(e["chunks"]) for e in examples) else "") + (" · pandas 3.0" if any("pandas" in "\n".join(e["chunks"]) for e in examples) else ""),
            "cases": [execute(example) for example in examples],
            "initialCaseId": examples[0]["id"],
        }
    for key, probe in manifest["probes"].items():
        namespace = {}
        with contextlib.redirect_stdout(io.StringIO()):
            exec(compile(probe["code"], "<answer-check:" + key + ">", "exec"), namespace)
        actual = cell(namespace["answer"])
        expected = probe["expected"]
        correct = math.isclose(actual, expected, rel_tol=0, abs_tol=1e-9) if isinstance(expected, (int, float)) and not isinstance(expected, bool) else actual == expected
        if not correct:
            raise AssertionError(f"{key}: expected {expected!r}, evaluated {actual!r}")
    result = {
        "manifestSha256": hashlib.sha256(raw).hexdigest(),
        "runtime": {"python": platform.python_version(), "numpy": np.__version__, "pandas": pd.__version__},
        "verifiedProbes": len(manifest["probes"]), "diagrams": diagrams,
    }
    if "--verify" in sys.argv[3:]:
        previous = json.loads(result_path.read_text(encoding="utf-8"))
        if result != previous:
            raise AssertionError("Recorded execution differs; inspect runtime versions and changed examples.")
        print(f"Verified {len(diagrams)} diagrams and {len(manifest['probes'])} answer checks.")
    else:
        result_path.write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        print(f"Recorded {len(diagrams)} diagrams and verified {len(manifest['probes'])} answer checks.")


if __name__ == "__main__":
    main()
