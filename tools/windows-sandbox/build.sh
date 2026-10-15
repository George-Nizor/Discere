#!/usr/bin/env bash
# Builds discere-sandbox.exe from WSL with the Windows Rust toolchain and copies it to dist/.
# The crate is copied to a Windows-local folder first: building from a \\wsl.localhost path is
# slow and flaky. Needs rustup/cargo on Windows and the MSVC build tools (link.exe).
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
cargo="${CARGO_EXE:-/mnt/c/Users/$(cmd.exe /c 'echo %USERNAME%' 2>/dev/null | tr -d '\r')/.cargo/bin/cargo.exe}"
scratch="${SANDBOX_BUILD_DIR:-$(wslpath "$(cmd.exe /c 'echo %LOCALAPPDATA%' 2>/dev/null | tr -d '\r')")/Temp/discere-sandbox-build}"
target="${SANDBOX_TARGET:-x86_64-pc-windows-msvc}"
mkdir -p "$scratch"
cp -r "$here/Cargo.toml" "$here/src" "$here/.cargo" "$scratch/"
[ -f "$here/Cargo.lock" ] && cp "$here/Cargo.lock" "$scratch/"
if [ -f "$scratch/Cargo.lock" ]; then lock=--locked; else lock=; fi
(cd "$scratch" && "$cargo" build --release $lock --target "$target")
cp "$scratch/Cargo.lock" "$here/Cargo.lock"
mkdir -p "$here/dist"
cp "$scratch/target/$target/release/discere-sandbox.exe" "$here/dist/discere-sandbox.exe"
echo "built $here/dist/discere-sandbox.exe ($target)"
