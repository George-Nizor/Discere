#!/usr/bin/env bash
# Proves discere-sandbox.exe on this Windows machine, driven from WSL.
#
# Downloads the pinned Rust (x86_64-pc-windows-gnu) and Python 3.12 embeddable runtimes,
# installs them into a Windows scratch folder the way the server does, grants the sandbox
# read access once, then checks: rustc compiles and the program runs with piped stdin; the
# wall, CPU, memory and process limits each report the right reason; the user's Documents
# folder and the network are out of reach; numpy and pandas import. Also times hello world
# inside and outside the sandbox, and drives the helper from Windows Node the way the server
# will (pipes, windowsHide) when node.exe is installed.
#
# Usage: ./test.sh            (set SANDBOX_TEST_DIR to move the Windows scratch folder)
set -uo pipefail

here="$(cd "$(dirname "$0")" && pwd)"
local_app_data="$(wslpath "$(cmd.exe /c 'echo %LOCALAPPDATA%' 2>/dev/null | tr -d '\r')")"
root="${SANDBOX_TEST_DIR:-$local_app_data/Temp/discere-sandbox-test}"
mkdir -p "$root/downloads"
win() { wslpath -w "$1"; }

[ -f "$here/dist/discere-sandbox.exe" ] || "$here/build.sh"
cp "$here/dist/discere-sandbox.exe" "$root/discere-sandbox.exe"
sandbox="$root/discere-sandbox.exe"

pass=0
fail=0
ok() { echo "PASS  $1"; pass=$((pass + 1)); }
bad() { echo "FAIL  $1"; fail=$((fail + 1)); }

# ---------- download and verify the pinned artifacts ----------
# sha256  bytes  url
pins="$(cat <<'EOF'
c7c1048e3f56088aa623d09ad1033ed247849747cd78fa1679fe82cf8283c8db 99362768 https://static.rust-lang.org/dist/rustc-1.93.1-x86_64-pc-windows-gnu.tar.xz
ecc44147c49635205d0f7b418144604faa1c3926d8f20d7d3f109f08fa2fd02a 26228964 https://static.rust-lang.org/dist/rust-std-1.93.1-x86_64-pc-windows-gnu.tar.xz
c6cd17eb2f127346876595bbc810c1366a0264c8787d371eb488b1ce9de4340d 5472212 https://static.rust-lang.org/dist/rust-mingw-1.93.1-x86_64-pc-windows-gnu.tar.xz
4acbed6dd1c744b0376e3b1cf57ce906f9dc9e95e68824584c8099a63025a3c3 11133606 https://www.python.org/ftp/python/3.12.10/python-3.12.10-embed-amd64.zip
86945f2ee6d10cdfd67bcb4069c1662dd711f7e2a4343db5cecec06b87cf31aa 12782922 https://files.pythonhosted.org/packages/2d/57/8aeaf160312f7f489dea47ab61e430b5cb051f59a98ae68b7133ce8fa06a/numpy-2.3.5-cp312-cp312-win_amd64.whl
536232a5fe26dd989bd633e7a0c450705fdc86a207fec7254a55e9a22950fe43 9741627 https://files.pythonhosted.org/packages/75/08/67cc404b3a966b6df27b38370ddd96b3b023030b572283d035181854aac5/pandas-3.0.1-cp312-cp312-win_amd64.whl
a8b2bc7bffae282281c8140a97d3aa9c14da0b136dfe83f850eea9a5f7470427 229892 https://files.pythonhosted.org/packages/ec/57/56b9bcc3c9c6a792fcbaf139543cee77261f3651ca9da0c93f5c1221264b/python_dateutil-2.9.0.post0-py2.py3-none-any.whl
4721f391ed90541fddacab5acf947aa0d3dc7d27b2e1e8eda2be8970586c3274 11050 https://files.pythonhosted.org/packages/b7/ce/149a00dd41f10bc29e5921b496af8b574d8413afcd5e30dfa0ed46c2cc5e/six-1.17.0-py2.py3-none-any.whl
1a403fada01ff9221ca8044d701868fa132215d84beb92242d9acd2147f667a8 347839 https://files.pythonhosted.org/packages/5c/23/c7abc0ca0a1526a0774eca151daeb8de62ec457e77262b66b359c3c7679e/tzdata-2025.2-py2.py3-none-any.whl
EOF
)"
while read -r sha bytes url; do
  file="$root/downloads/${url##*/}"
  [ -f "$file" ] || curl -sSfL -o "$file" "$url" || { bad "download $url"; continue; }
  if [ "$(stat -c %s "$file")" = "$bytes" ] && echo "$sha  $file" | sha256sum -c --quiet -; then
    :
  else
    bad "checksum ${url##*/}"
    rm -f "$file"
    exit 1
  fi
done <<<"$pins"
ok "downloaded and verified 9 pinned artifacts"

# ---------- install (unpacked on the Linux side, then copied, which is much faster) ----------
rust="$root/rust"
python_root="$root/py"
if [ ! -f "$rust/bin/rustc.exe" ]; then
  extract="$(mktemp -d)"
  for c in rustc rust-std rust-mingw; do
    tar -xJf "$root/downloads/$c-1.93.1-x86_64-pc-windows-gnu.tar.xz" -C "$extract"
  done
  mkdir -p "$rust"
  for dir in "$extract"/*/; do
    while read -r component; do
      [ -n "$component" ] && cp -r "$dir$component/." "$rust/"
    done <"$dir/components"
  done
  rm -f "$rust/manifest.in"
  rm -rf "$extract"
fi
if [ ! -f "$python_root/python/python.exe" ]; then
  mkdir -p "$python_root/python" "$python_root/site-packages"
  python3 -I - "$root" <<'EOF'
import glob, sys, zipfile
root = sys.argv[1]
zipfile.ZipFile(root + "/downloads/python-3.12.10-embed-amd64.zip").extractall(root + "/py/python")
for wheel in glob.glob(root + "/downloads/*.whl"):
    zipfile.ZipFile(wheel).extractall(root + "/py/site-packages")
EOF
fi

R="$(win "$rust")"
P="$(win "$python_root")"
"$sandbox" check >"$root/check.json" && ok "check: $(cat "$root/check.json")" || bad "check: $(cat "$root/check.json")"
start=$(date +%s%N)
"$sandbox" grant --read "$R" && "$sandbox" grant --read "$P" && ok "grant on rust and py ($(( ($(date +%s%N) - start) / 1000000 )) ms, both)" || bad "grant"

status="$root/status.json"
S="$(win "$status")"
work="$root/work"
fresh_work() { rm -rf "$work"; mkdir -p "$work"; W="$(win "$work")"; }
reason() { sed -n 's/.*"reason":"\([a-z]*\)".*/\1/p' "$status"; }

# The rustc command line the server should use (inside the sandbox, cwd = work dir).
RUSTC=(--edition 2024 --color never --crate-name main -C opt-level=0 -C debuginfo=0 -C strip=debuginfo main.rs -o main.exe)
compile() {
  "$sandbox" run --work "$W" --read "$R" --memory-mb 1024 --cpu-ms 20000 --wall-ms 15000 --processes 4 \
    --status "$S" -- "$R\\bin\\rustc.exe" "${RUSTC[@]}"
}
launch() { # memory cpu wall processes [stdin]
  "$sandbox" run --work "$W" --memory-mb "$1" --cpu-ms "$2" --wall-ms "$3" --processes "$4" \
    --status "$S" -- "$W\\main.exe"
}
build_program() { # name, source on stdin
  fresh_work
  cat >"$work/main.rs"
  if compile 2>"$root/compile.err" && [ "$(reason)" = ok ] && [ -f "$work/main.exe" ]; then
    return 0
  fi
  bad "$1 did not compile: $(cat "$status") $(head -c 400 "$root/compile.err")"
  return 1
}

# ---------- 1. Rust hello world with piped stdin ----------
hello='use std::io::Read;
fn main() {
    let mut s = String::new();
    std::io::stdin().read_to_string(&mut s).unwrap();
    println!("hello, {}", s.trim());
}'
fresh_work
echo "$hello" >"$work/main.rs"
t0=$(date +%s%N)
compile 2>"$root/compile.err"
t1=$(date +%s%N)
if [ "$(reason)" = ok ] && [ -f "$work/main.exe" ]; then ok "rustc compiled hello world in the sandbox ($(( (t1 - t0) / 1000000 )) ms)"; else bad "rustc in sandbox: $(cat "$status") $(cat "$root/compile.err")"; fi
out="$(echo sandbox | launch 256 2000 4000 1)"
t2=$(date +%s%N)
[ "$out" = "hello, sandbox" ] && [ "$(reason)" = ok ] && ok "hello world ran with piped stdin: '$out' ($(( (t2 - t1) / 1000000 )) ms)" || bad "hello run: '$out' $(cat "$status")"
echo "TIME  sandboxed compile+run: $(( (t2 - t0) / 1000000 )) ms"

outside="$root/outside"
rm -rf "$outside"; mkdir -p "$outside"; echo "$hello" >"$outside/main.rs"
t0=$(date +%s%N)
(cd "$outside" && "$rust/bin/rustc.exe" "${RUSTC[@]}" && echo outside | ./main.exe >/dev/null)
t1=$(date +%s%N)
echo "TIME  unsandboxed compile+run: $(( (t1 - t0) / 1000000 )) ms"

# ---------- 2. limits ----------
if build_program "busy loop" <<'EOF'
fn main() { let mut x = 0u64; loop { x = x.wrapping_add(1); std::hint::black_box(x); } }
EOF
then
  launch 256 1000 5000 1 >/dev/null 2>&1
  [ "$(reason)" = cpu ] && ok "busy loop stopped by CPU limit: $(cat "$status")" || bad "busy loop (cpu): $(cat "$status")"
  launch 256 10000 1500 1 >/dev/null 2>&1
  [ "$(reason)" = wall ] && ok "busy loop stopped by wall limit when CPU allows more: $(cat "$status")" || bad "busy loop (wall): $(cat "$status")"
fi

if build_program "sleeper" <<'EOF'
fn main() { std::thread::sleep(std::time::Duration::from_secs(30)); }
EOF
then
  launch 256 2000 1000 1 >/dev/null 2>&1
  [ "$(reason)" = wall ] && ok "sleeping program stopped by wall limit: $(cat "$status")" || bad "sleeper: $(cat "$status")"
fi

if build_program "1 GB allocation" <<'EOF'
fn main() { let v = vec![1u8; 1 << 30]; println!("{}", v[12345]); }
EOF
then
  launch 256 2000 4000 1 >/dev/null 2>"$root/run.err"
  [ "$(reason)" = memory ] && ok "1 GB allocation under --memory-mb 256: $(cat "$status") stderr: $(head -c 120 "$root/run.err")" || bad "memory: $(cat "$status")"
fi

if build_program "child process" <<'EOF'
fn main() {
    let status = std::process::Command::new("C:\\Windows\\System32\\cmd.exe").args(["/c", "echo child ran"]).status();
    println!("{:?}", status);
    status.unwrap();
}
EOF
then
  out="$(launch 256 2000 4000 1 2>/dev/null)"
  [ "$(reason)" = processes ] && ok "child process refused with --processes 1: '$out' $(cat "$status")" || bad "processes: '$out' $(cat "$status")"
fi

if build_program "Documents read" <<'EOF'
fn main() {
    let profile = "C:\\Users\\".to_string() + &std::env::args().nth(1).unwrap_or_default();
    for path in [profile.clone() + "\\Documents", profile.clone()] {
        match std::fs::read_dir(&path) {
            Ok(entries) => println!("READ {} ({} entries)", path, entries.count()),
            Err(e) => println!("DENIED {}: {}", path, e),
        }
    }
}
EOF
then
  user="$(cmd.exe /c 'echo %USERNAME%' 2>/dev/null | tr -d '\r')"
  out="$("$sandbox" run --work "$W" --memory-mb 256 --cpu-ms 2000 --wall-ms 4000 --processes 1 --status "$S" -- "$W\\main.exe" "$user" 2>&1)"
  if echo "$out" | grep -q READ; then bad "user folders readable: $out"; else ok "user folders unreadable: $(echo "$out" | tr '\n' ' ')"; fi
fi

if build_program "network" <<'EOF'
use std::net::{TcpStream, ToSocketAddrs};
use std::time::Duration;
fn main() {
    for target in ["1.1.1.1:443", "127.0.0.1:135"] {
        let addr = target.parse().unwrap();
        match TcpStream::connect_timeout(&addr, Duration::from_millis(1500)) {
            Ok(_) => println!("CONNECTED {}", target),
            Err(e) => println!("BLOCKED {}: {}", target, e),
        }
    }
    match "example.com:80".to_socket_addrs() {
        Ok(mut a) => println!("DNS example.com -> {:?}", a.next()),
        Err(e) => println!("DNS failed: {}", e),
    }
}
EOF
then
  out="$(launch 256 2000 8000 1 2>&1)"
  if echo "$out" | grep -q CONNECTED; then bad "network reachable: $out"; else ok "network blocked: $(echo "$out" | tr '\n' ' ')"; fi
  outside_net="$(cd "$work" && ./main.exe 2>&1 | head -1)"
  echo "INFO  same program outside the sandbox: $outside_net"
fi

# ---------- 3. Python with numpy and pandas ----------
fresh_work
py() { # memory, code
  "$sandbox" run --work "$W" --read "$P" --env OPENBLAS_NUM_THREADS=1 --env OMP_NUM_THREADS=1 \
    --env MKL_NUM_THREADS=1 --env NUMEXPR_NUM_THREADS=1 --memory-mb "$1" --cpu-ms 10000 --wall-ms 20000 \
    --processes 1 --status "$S" -- "$P\\python\\python.exe" -I -S -B -c "$2"
}
pycode="import sys; sys.path.insert(0, r'$P\\site-packages'); import numpy, pandas; print(pandas.__version__, numpy.__version__, int(pandas.DataFrame({'a': numpy.arange(4)}).a.sum()))"
t0=$(date +%s%N)
out="$(py 512 "$pycode" 2>&1 | tr -d "\r")"
t1=$(date +%s%N)
[ "$out" = "3.0.1 2.3.5 6" ] && [ "$(reason)" = ok ] && ok "python imports numpy and pandas in the sandbox: '$out' ($(( (t1 - t0) / 1000000 )) ms) $(cat "$status")" || bad "python: '$out' $(cat "$status")"
out="$(py 512 "import socket, os
try:
    socket.create_connection(('1.1.1.1', 443), timeout=1.5); print('CONNECTED')
except OSError as e: print('BLOCKED', e)
try:
    print('READ', os.listdir(os.path.expanduser('~') if '~' not in os.path.expanduser('~') else r'C:\\Users'))
except OSError as e: print('DENIED', e)
open('made.txt', 'w').write('x'); print('WORK', os.listdir('.'))
import tempfile; print('TEMP', tempfile.gettempdir())" 2>&1)"
if echo "$out" | grep -q -e CONNECTED -e '^READ'; then bad "python escaped: $out"; else ok "python: no network, no user folders, work dir writable: $(echo "$out" | tr '\n' ' ')"; fi
out="$(py 256 "x = bytearray(1 << 30)" 2>&1 | tail -1)"
[ "$(reason)" = memory ] && ok "python 1 GB allocation under 256 MB: $(cat "$status") ($out)" || bad "python memory: $(cat "$status") $out"

# ---------- 4. the way the server calls it: Windows Node, pipes, windowsHide ----------
node="/mnt/c/Program Files/nodejs/node.exe"
if [ -x "$node" ]; then
  fresh_work
  echo "$hello" >"$work/main.rs"
  compile 2>/dev/null
  cp "$here/node-check.cjs" "$root/node-check.cjs" 2>/dev/null
  out="$("$node" "$(win "$root/node-check.cjs")" "$(win "$sandbox")" "$W" "$S" 2>&1)"
  echo "$out" | grep -q '^NODE OK' && ok "driven from Node with pipes and windowsHide: $out" || bad "node: $out"
else
  echo "SKIP  Windows node.exe not found"
fi

echo
echo "$pass passed, $fail failed"
[ "$fail" = 0 ]
