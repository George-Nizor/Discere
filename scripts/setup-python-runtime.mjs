import { spawnSync } from "node:child_process";
import { accessSync, existsSync, mkdirSync, realpathSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
if (process.platform !== "linux" || process.arch !== "x64")
  throw new Error(
    "Python construction currently needs x86_64 Linux. On Windows, run this command from Ubuntu WSL.",
  );
for (const file of [
  "/usr/bin/python3.12",
  "/usr/bin/bwrap",
  "/usr/lib/x86_64-linux-gnu/libseccomp.so.2",
])
  try {
    accessSync(file);
  } catch {
    throw new Error(
      "Install Ubuntu Python 3.12, python3.12-venv, bubblewrap 0.9+ and libseccomp2 before Python practice.",
    );
  }
const directory = path.join(root, "data/python-runtime");
mkdirSync(path.dirname(directory), { recursive: true });
if (existsSync(directory) && !realpathSync(directory).startsWith(realpathSync(root) + path.sep))
  throw new Error("The Python environment must stay inside Discere.");
const run = (command, args) => {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: "inherit",
    shell: false,
    windowsHide: true,
  });
  if (result.error) throw result.error;
  if (result.status !== 0)
    throw new Error("Python runtime setup failed; see the preceding command output.");
};
run("/usr/bin/python3.12", ["-m", "venv", directory]);
run(path.join(directory, "bin/python"), [
  "-m",
  "pip",
  "install",
  "--disable-pip-version-check",
  "--only-binary=:all:",
  "--index-url",
  "https://pypi.org/simple",
  "-r",
  path.join(root, "scripts/python-runtime-requirements.txt"),
]);
run(path.join(directory, "bin/python"), [
  "-I",
  "-c",
  "import numpy,pandas; assert numpy.__version__ == '2.3.5' and pandas.__version__ == '3.0.1'; print('Reviewed NumPy and pandas versions are installed.')",
]);
console.log(
  "Python dependencies are ready. The server will still require the complete OS sandbox for each program.",
);
