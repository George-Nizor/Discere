# discere-sandbox

`discere-sandbox.exe` runs one learner program on Windows with no network and no access to your
files. On Windows the Discere server starts it where Linux uses Bubblewrap and prlimit. The program
runs in an AppContainer with no capabilities, inside a Job Object that limits processes, memory,
CPU time and wall time.

## Commands

```text
discere-sandbox.exe run --work <dir> [--read <dir>]... [--env KEY=VALUE]...
    --memory-mb <n> --cpu-ms <n> --wall-ms <n> --processes <n> --status <file> -- <exe> [args...]
discere-sandbox.exe grant --read <dir> [--read <dir>]...
discere-sandbox.exe check
```

### run

- The program runs in the AppContainer profile `Discere.Sandbox` with no capabilities. The profile
  is created on first use; after that its SID is derived from the name.
- The container gets full control of `--work`, set as an inheritable ACE on the folder and everything
  already in it. Each `--read` folder gets read and execute, but only when its ACL does not already
  allow that (an ACE granted on the folder or inherited from a granted parent both count). That
  check is one ACL read, so a folder that went through `grant` adds nothing to a run.
- Job Object limits: kill on job close, die on unhandled exception, active processes = `--processes`,
  job-wide committed memory = `--memory-mb`, job-wide user CPU time = `--cpu-ms`, and UI
  restrictions (desktop, display settings, exit Windows, global atoms, USER handles, clipboard read
  and write, system parameters). Breakaway is not allowed. The child is created suspended, put in
  the job, then resumed.
- After `--wall-ms` the whole job is killed.
- Environment: an empty block plus `SystemRoot`, `SystemDrive`, `windir`, `TEMP` and `TMP` (both set
  to the work folder) and every `--env`. `PATH` only exists if you pass it with `--env`. A later
  `--env` replaces an earlier variable of the same name.
- The working directory is `--work`. `<exe>` must be a path; it is never looked up on `PATH`.
- The child uses the helper's own stdin, stdout and stderr. Only those three handles are inherited.
  The helper never writes to stdout. Its own errors go to stderr, starting with `discere-sandbox:`.
- When the program ends, anything it left running in the job is killed, the same way Bubblewrap's
  namespace dies with its first process.
- Exit code: 0 when the program ran, whatever its own exit code was. 2 when the helper failed (bad
  arguments, a profile or ACL error, the program could not be started).

The status file is written to the `--status` path, which sits outside the sandbox and is chosen by
the caller:

```json
{"exitCode": 0, "reason": "ok", "message": "exited after 65 ms"}
```

| reason | meaning | exitCode |
| --- | --- | --- |
| `ok` | The program exited by itself. The message notes it if an allocation or a process start was refused and the program carried on. | Its exit code |
| `wall` | Killed at `--wall-ms`. | `null` |
| `cpu` | Killed when the job's user CPU time reached `--cpu-ms`. | `null` |
| `memory` | An allocation was refused at `--memory-mb` and the program then exited non-zero. | Its exit code |
| `processes` | A process start was refused at `--processes` and the program then exited non-zero. | Its exit code |
| `error` | The helper failed. The helper's exit code is 2. | `null` |

`exitCode` is a signed 32-bit number. A crash shows up as a negative NTSTATUS, not as a signal:
a stack overflow is `-1073741571` (0xC00000FD), and Rust's abort after a failed allocation is
`-1073740791` (0xC0000409). The server should treat any negative code as "stopped at a limit or
crashed", the way it treats 128 and above from Bubblewrap.

### grant

`grant --read <dir>` gives the container read and execute on a folder, inheritable, and propagates
that to every file already in it. Run it once after installing a runtime. It does nothing when the
grant is already there. On this machine it took about 70 ms for the Rust toolchain and the Python
folder together.

### check

`check` creates or derives the profile, then starts `cmd.exe /c exit 7` in the container and in a
job, and expects exit code 7. On success it prints the following and exits 0:

```json
{"ok":true,"appContainer":true,"jobObject":true,"profile":"Discere.Sandbox","sid":"S-1-15-2-..."}
```

On failure it prints `{"ok":false,"appContainer":false,"profile":...,"message":...}` and exits 2.

## What the server should pass

Tested on Windows 11 build 26200. "Work" is a fresh folder the server creates for each program.

Compile. Run this with the work folder as the current directory and `main.rs` inside it:

```text
discere-sandbox.exe run --work <work> --read <rust prefix> --memory-mb 1024 --cpu-ms 20000
    --wall-ms 15000 --processes 4 --status <status file> --
    <rust prefix>\bin\rustc.exe --edition 2024 --color never --crate-name main
    -C opt-level=0 -C debuginfo=0 -C strip=debuginfo main.rs -o main.exe
```

- No `-C linker=`, no `PATH` and no other `--env` are needed. The `x86_64-pc-windows-gnu` rustc
  finds rust-mingw's `x86_64-w64-mingw32-gcc.exe` and `ld.exe` under
  `lib\rustlib\x86_64-pc-windows-gnu\bin\self-contained` by itself. Temporary files go to the work
  folder through `TMP`.
- The compile needs at least `--processes 3` (rustc, gcc, ld). With 1 it fails with Windows error
  1816, and with 2 the link fails. Use 4 for some headroom. Hello world compiles within 128 MB.
- The output is `main.exe`. Linux's `-o main` would give a file Windows will not run.

Run:

```text
discere-sandbox.exe run --work <work> --memory-mb 256 --cpu-ms 2000 --wall-ms 4000
    --processes 1 --status <status file> -- <work>\main.exe
```

No `--read` is needed: the program is linked statically against the Rust standard library, and
everything else comes from System32.

Python. `<root>` is the folder with `python\` (the unzipped embeddable package) and
`site-packages\` (the unzipped wheels):

```text
discere-sandbox.exe run --work <work> --read <root> --env OPENBLAS_NUM_THREADS=1
    --env OMP_NUM_THREADS=1 --env MKL_NUM_THREADS=1 --env NUMEXPR_NUM_THREADS=1
    --memory-mb 256 --cpu-ms 10000 --wall-ms 20000 --processes 1 --status <status file> --
    <root>\python\python.exe -I -S -B <bootstrap.py or -c ...>
```

- The script has to put `<root>\site-packages` on `sys.path` itself. The embeddable package's
  `python312._pth` fixes the path, and `-S` turns off `site`.
- Keep `OPENBLAS_NUM_THREADS=1`. Without it, numpy's OpenBLAS commits a buffer for each of this
  machine's 16 cores, and `import pandas` fails with MemoryError at 512 MB. With it, pandas imports
  and runs within 96 MB.
- Importing pandas calls `platform`, which tries to start `cmd /c ver`. With `--processes 1` that
  start is refused, Python carries on, and the status is `ok` with "a process start beyond 1 was
  refused" in the message.
- `import pandas` takes about 1.6 s on this machine, with or without the sandbox. Numpy takes
  0.3 s. A 4 s wall limit leaves little room for the learner's own code, so use more.

## Results on this machine

`./test.sh` runs everything below from WSL against the real Windows install. The last run passed
16 of 16.

| Check | Result |
| --- | --- |
| `check` | ok, AppContainer SID `S-1-15-2-3402887298-...` |
| rustc compiles hello world in the sandbox | ok, about 215 ms |
| The compiled program reads piped stdin | `hello, sandbox` |
| Busy loop, `--cpu-ms 1000` | `cpu`, exitCode null |
| Busy loop, `--cpu-ms 10000 --wall-ms 1500` | `wall` |
| `sleep(30)`, `--wall-ms 1000` | `wall` |
| `vec![1u8; 1 << 30]`, `--memory-mb 256` | `memory`, exitCode -1073740791, stderr "memory allocation of 1073741824 bytes failed" |
| `Command::new(cmd.exe).status().unwrap()`, `--processes 1` | `processes`, exitCode 101; the spawn fails with Windows error 1816 |
| `read_dir(C:\Users\George\Documents)` and `C:\Users\George` | Access is denied (os error 5) |
| TCP to 1.1.1.1:443 | os error 10013 (forbidden by access permissions); the same program connects outside the sandbox |
| TCP to 127.0.0.1:135 | times out (AppContainers cannot reach loopback) |
| DNS lookup of example.com | No such host is known |
| Python: `import numpy, pandas` | `3.0.1 2.3.5`, status ok |
| Python: socket, `os.listdir(C:\Users)`, writing in the work folder | 10013, Access is denied, the write works; `tempfile.gettempdir()` is the work folder |
| Python: `bytearray(1 << 30)`, `--memory-mb 256` | `memory`, MemoryError, exitCode 1 |
| Rust stack overflow | `ok`, exitCode -1073741571, returns in about 60 ms with no error dialog |
| Driven from Windows Node (`spawn`, piped stdio, `windowsHide`) | stdout `hello, node`, status ok, 148 ms in total |

Timing for compiling hello world and running it with stdin, five runs each, started from WSL:
about 275 ms in the sandbox and 255 ms without it. The sandbox adds about 20 ms. On Linux the
same thing takes about 0.5 s.

## Artifacts used in the tests

These are the files pinned in `apps/server/src/code-runtimes/artifacts.ts`. `test.sh` downloads
them, then checks each one's size and SHA-256 before using it. The SHA-256 of the Python zip is not
published by python.org (it lists MD5 only). Its MD5 matched the published
`fe8ef205f2e9c3ba44d0cf9954e1abd3`.

| File | Bytes | SHA-256 |
| --- | --- | --- |
| [rustc-1.93.1-x86_64-pc-windows-gnu.tar.xz](https://static.rust-lang.org/dist/rustc-1.93.1-x86_64-pc-windows-gnu.tar.xz) | 99362768 | `c7c1048e3f56088aa623d09ad1033ed247849747cd78fa1679fe82cf8283c8db` |
| [rust-std-1.93.1-x86_64-pc-windows-gnu.tar.xz](https://static.rust-lang.org/dist/rust-std-1.93.1-x86_64-pc-windows-gnu.tar.xz) | 26228964 | `ecc44147c49635205d0f7b418144604faa1c3926d8f20d7d3f109f08fa2fd02a` |
| [rust-mingw-1.93.1-x86_64-pc-windows-gnu.tar.xz](https://static.rust-lang.org/dist/rust-mingw-1.93.1-x86_64-pc-windows-gnu.tar.xz) | 5472212 | `c6cd17eb2f127346876595bbc810c1366a0264c8787d371eb488b1ce9de4340d` |
| [python-3.12.10-embed-amd64.zip](https://www.python.org/ftp/python/3.12.10/python-3.12.10-embed-amd64.zip) | 11133606 | `4acbed6dd1c744b0376e3b1cf57ce906f9dc9e95e68824584c8099a63025a3c3` |
| [numpy-2.3.5-cp312-cp312-win_amd64.whl](https://files.pythonhosted.org/packages/2d/57/8aeaf160312f7f489dea47ab61e430b5cb051f59a98ae68b7133ce8fa06a/numpy-2.3.5-cp312-cp312-win_amd64.whl) | 12782922 | `86945f2ee6d10cdfd67bcb4069c1662dd711f7e2a4343db5cecec06b87cf31aa` |
| [pandas-3.0.1-cp312-cp312-win_amd64.whl](https://files.pythonhosted.org/packages/75/08/67cc404b3a966b6df27b38370ddd96b3b023030b572283d035181854aac5/pandas-3.0.1-cp312-cp312-win_amd64.whl) | 9741627 | `536232a5fe26dd989bd633e7a0c450705fdc86a207fec7254a55e9a22950fe43` |
| [python_dateutil-2.9.0.post0-py2.py3-none-any.whl](https://files.pythonhosted.org/packages/ec/57/56b9bcc3c9c6a792fcbaf139543cee77261f3651ca9da0c93f5c1221264b/python_dateutil-2.9.0.post0-py2.py3-none-any.whl) | 229892 | `a8b2bc7bffae282281c8140a97d3aa9c14da0b136dfe83f850eea9a5f7470427` |
| [six-1.17.0-py2.py3-none-any.whl](https://files.pythonhosted.org/packages/b7/ce/149a00dd41f10bc29e5921b496af8b574d8413afcd5e30dfa0ed46c2cc5e/six-1.17.0-py2.py3-none-any.whl) | 11050 | `4721f391ed90541fddacab5acf947aa0d3dc7d27b2e1e8eda2be8970586c3274` |
| [tzdata-2025.2-py2.py3-none-any.whl](https://files.pythonhosted.org/packages/5c/23/c7abc0ca0a1526a0774eca151daeb8de62ec457e77262b66b359c3c7679e/tzdata-2025.2-py2.py3-none-any.whl) | 347839 | `1a403fada01ff9221ca8044d701868fa132215d84beb92242d9acd2147f667a8` |

pandas 3.0.1 declares `tzdata; sys_platform == "win32"`, so the tzdata wheel is needed on Windows.
A Rust install copies each component's subcomponent folders, as listed in its `components` file,
into one prefix. Leave out the per-component `manifest.in`.

## Limits and how they are told apart

- Limits are reported from Job Object notifications, delivered through an I/O completion port, and
  checked against the job's accounting as a backstop, since Windows does not guarantee delivery.
- CPU: the job uses `JOB_OBJECT_POST_AT_END_OF_JOB`, so reaching the limit posts a message instead
  of killing the job silently, and the helper kills the job itself. The helper also reads the job's
  total user time every 50 ms. Only user-mode time counts, which is all Windows offers per job.
  Linux's `--cpu` counts user and system time. A program that spends its time in system calls is
  caught by the wall limit instead.
- Memory is the job's committed memory, across all its processes. Linux's `--as` limits address
  space instead. Reserved but uncommitted memory does not count on Windows, so the same number
  is somewhat more generous here. If the notification is lost, the helper still reports `memory`
  when the program exited non-zero with the job's peak commit within 4 MB of the limit.
- Processes: the only signal is the `ACTIVE_PROCESS_LIMIT` notification. Job accounting does not
  count refused starts, so a lost notification would show as `ok` or the program's own error.
  That never happened in testing.
- `memory` and `processes` are only the reason when the program then exits non-zero. A program that
  handles the refusal and exits 0 gets `ok`, with the refusal noted in `message`.
- When the program exits, the helper kills whatever is left in the job and then waits up to 250 ms
  for queued notifications. A limit hit just before the exit is still reported.

## AppContainer behaviour the helper works around

- CreateProcess needs `LOCALAPPDATA`. With a block that only has the variables above,
  creating an AppContainer process fails with error 203 (ERROR_ENVVAR_NOT_FOUND). Windows derives
  the container's folder from `LOCALAPPDATA`, then rewrites `LOCALAPPDATA`, `TEMP` and `TMP` to
  `%LOCALAPPDATA%\Packages\discere.sandbox\AC\Temp`. That folder is shared by every run, so one
  program could leave files for the next. The helper passes `LOCALAPPDATA` so the process can be
  created. Then, while the child is still suspended, it swaps the child's environment block for
  the exact one described above. It does this by writing a new block into the child and pointing
  the PEB's process parameters at it (x64 offsets: PEB+0x20, then +0x80 for the block and +0x3F0
  for its size). The child runs no code before the swap. If any step fails, the program still runs
  with the Windows values, and the status message ends with "(TEMP/TMP were left at the
  AppContainer's own folder)". `LOCALAPPDATA` itself is not in the final block.
- When the helper has a console, the child shares it. Node gives one to a child started
  with `windowsHide`, and so does a terminal. With no console the child is started with
  `CREATE_NO_WINDOW`, so it gets a hidden console of its own, and the programs it starts (rustc's
  gcc and ld) never open a window.
- An AppContainer can still read anything granted to "ALL
  APPLICATION PACKAGES", which means `C:\Windows` and `C:\Program Files`. That is how system DLLs
  load. It cannot read the user profile, Documents, or any folder it was not granted. A
  less-privileged AppContainer (LPAC) would also drop those grants. It is not used here because
  rustc, gcc and Python would need checking against it first.
- `cmd.exe`'s `dir` in the work folder says "Access is denied", although Rust's `read_dir` and
  Python's `os.listdir` both work there. `cmd` presumably reads something above the folder;
  learner programs are not affected.

## Building

```bash
./build.sh        # from WSL; copies the crate to %LOCALAPPDATA%\Temp\discere-sandbox-build
```

`build.sh` builds with the Windows cargo for `x86_64-pc-windows-msvc`, using Visual Studio 2019
Build Tools (MSVC 14.29) on this machine. It copies the result to `dist/discere-sandbox.exe`. The
CRT is linked statically (`.cargo/config.toml`), so the exe imports only `kernel32`, `advapi32`,
`userenv`, `ntdll` and an api-set DLL, with no Visual C++ runtime. The only dependency is
`windows-sys` 0.61.2, pinned exactly. Release profile: `opt-level = "z"`, LTO, one codegen unit,
`panic = "abort"`, stripped. Size: about 280 KB. The `x86_64-pc-windows-gnu` target was not tried,
because MSVC worked. Set `SANDBOX_TARGET` to try it.

## Files

- `src/main.rs`: the helper.
- `build.sh`: build from WSL into `dist/`.
- `test.sh`: download, verify and install the runtimes into
  `%LOCALAPPDATA%\Temp\discere-sandbox-test` (or `SANDBOX_TEST_DIR`), then run the checks above.
- `node-check.cjs`: the Node half of `test.sh`, which calls the helper the way the server will.
