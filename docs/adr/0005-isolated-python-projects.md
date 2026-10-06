# ADR 0005: Execute learner Python in a mandatory Linux sandbox

Status: Accepted
Date: 2026-10-02

The reviewed Python lessons replay trusted executions. Independent construction needs actual
learner programs, including NumPy and pandas, while preserving server-owned answers and study data.

A separate Python project service uses an ephemeral Bubblewrap worker for each run. It receives
only the learner program, reviewed case inputs and, for function tasks, a function name and input
argument names. Expected results and reference programs stay in the parent service. The worker
executes CPython 3.12 with NumPy 2.3.5 and pandas 3.0.1; it never contacts a model or installs packages.

The implemented host is x86_64 Linux with Ubuntu's Python 3.12, Bubblewrap 0.9+ and libseccomp2.
Windows uses the existing Ubuntu WSL server. Other hosts fail closed with an actionable runtime
message. There is no bare-CPython fallback. The setup command installs pinned free dependencies
into ignored data/python-runtime; the check command tests the complete execution boundary.

Bubblewrap creates separate mount, user, PID, IPC, network and UTS namespaces. Nested user
namespaces are disabled and asserted disabled. The worker runs as namespace UID/GID 65534,
with capabilities dropped and a new session. Only the interpreter, standard library, shared
system libraries, installed package directory and bootstrap are bound read-only. Home,
workspace, owner SQLite, sockets and parent environment are excluded. The root and proc mounts
are read-only; temporary storage is bounded to 64 MiB and shared temporary storage to 16 MiB.
The network namespace contains its own loopback interface.

The bootstrap sets hard address-space, CPU, file-size, descriptor, core and stack limits before
loading the pinned packages. It then sets the process limit to zero and installs a libseccomp
filter denying process creation/replacement, namespace changes, mounts, tracing and selected
privileged kernel operations. The filter is permanent for the learner process. The parent kills
the Bubblewrap process after four seconds; namespace and parent-death behavior prevent an
orphan worker. At most two workers run per service instance. Input and output are bounded.

This uses the [Bubblewrap isolation model](https://github.com/containers/bubblewrap),
[Python hard resource limits](https://docs.python.org/3.12/library/resource.html) and
[libseccomp API](https://github.com/seccomp/libseccomp/blob/main/include/seccomp.h.in).
Namespace and syscall isolation reduce exposure; they do not eliminate kernel, interpreter or
native-library vulnerabilities. This local single-user boundary is not a claim of a hardened
multi-tenant execution service.

Programs assign result or define the requested callable. The checker invokes callable tasks
with each case's supplied arguments. Values normalize to bounded JSON: NumPy arrays and Series
become ordered arrays; DataFrames retain ordered column names and rows. Missing values become
null, known zeros and Boolean types remain distinct, and timestamps use ISO text. Printed
output is shown separately. Comparison preserves array order, duplicate observations and dictionary
keys; finite numbers use max(1e-9, 1e-9 × abs(expected)) tolerance. These cases provide evidence of
behavior, not a proof of correctness for every input or of a particular algorithm.

Three reviewed sidecars contain 22 tasks and 66 cases. All 21 published lessons are represented;
pivot and melt receive separate tasks. Every expected result was specified separately from
reference execution. Publication binds the strict schemas, lesson/concept/source references,
writing gate and review to the exact serialized hash.

Migration 0008 adds snapshots and idempotent actions. The four tutoring modes, immutable mode,
revision conflict handling, confirmed solution access, mistake-to-Continue behavior and bounded
independent/assisted XP follow ADR 0004. Exam correctness and rewards stay hidden until submission
or explicit early termination. Saved projects retain their original definitions. Construction
does not complete lessons or manufacture concept mastery. Fresh delayed construction, larger
data, inference, machine learning and remaining source-map curricula are still required.
