# ADR 0007: Windows release through Instrumenta

## Status

Accepted, October 2026.

## Context

Until 1.1.0 Discere ran only from a source checkout: Instrumenta started `pnpm` in WSL, the database
lived in the repository's `data/` folder, and code practice needed Linux (Bubblewrap). Nobody without
the checkout could use it, and the owner's copy was a development copy.

## Decision

Discere is published as a Windows release that Instrumenta 0.15.0 and later installs, updates and
rolls back as a `managed-service` product.

- **The bundle.** `pnpm package:release` (scripts/package-release.mjs) builds
  `dist/release/discere-<version>.zip`. It keeps the repository's layout for every file the server
  reads (`content/` without authoring sources, `prompts/`, `apps/web/dist`, `apps/server/drizzle` and
  the Python runner scripts) and marks its root with `discere-bundle.json`, so `@discere/paths`
  resolves the same paths in a checkout and an install. The server is bundled into
  `apps/server/dist/index.mjs` with esbuild. `runtime/` holds a pinned `node.exe` and
  `discere-sandbox.exe`. better-sqlite3 is a Node-API addon, so its prebuilt Windows binary is
  copied as is. The bundle's `instrumenta/product.json` starts `runtime/node.exe` with
  `DISCERE_PACKAGED=1`.
- **The data.** A packaged Discere keeps the database, backups and code toolchains in
  `%LOCALAPPDATA%\Discere`, outside the version folder, so an update or uninstall never touches it.
  `DISCERE_DATA_DIR` overrides it. A checkout still uses `data/`.
- **Code practice.** `tools/windows-sandbox` is a small Rust program that starts a process in an
  AppContainer with no capabilities (no network, none of the user's files) inside a Job Object that
  limits memory, CPU time and process count and kills everything when the run ends. Rust, Python and
  SQL practice run through it on Windows with the same limits and messages as on Linux.
- **Toolchains.** The release does not carry Rust or Python. The first time a learner opens code
  practice, Discere offers a one-time download: Rust 1.93.1 for `x86_64-pc-windows-gnu` (whose
  rust-mingw component includes a linker, so Visual Studio is not needed) and the embeddable
  Python 3.12.10 with the reviewed NumPy and pandas wheels. Every file is pinned by URL, size and
  SHA-256 in `apps/server/src/code-runtimes/artifacts.ts` and checked before it is unpacked.
- **Tutoring.** The Codex and Claude Code CLIs are found on the Windows PATH. Node cannot start
  npm's `.cmd` shims without a shell, so `resolveCliCommand` starts the native `codex.exe` behind
  the shim instead.
- **Publishing.** A `v<version>` tag runs `.github/workflows/release.yml` on `windows-latest`. It
  builds the sandbox helper, packages, starts the bundle from its own `node.exe` as a smoke test, and
  publishes the zip with an `instrumenta-release.json` written by Instrumenta's
  `scripts/instrumenta-release.cjs`.

## Consequences

The release is about 41 MB. The toolchains are about 131 MB (Rust) and 34 MB (Python), downloaded
once and kept across updates. A Linux checkout is unchanged and remains the development path.
AppContainer isolation is a boundary for one local learner, like Bubblewrap on Linux. It does not
protect against Windows kernel or toolchain vulnerabilities.
