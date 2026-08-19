# Discere Local Setup

Discere is currently a local-only prototype. The web interface and API bind to the loopback interface, and learning state is stored in a SQLite database inside the repository.

## Supported environment

- Windows 10 or 11, macOS, or a recent Linux distribution
- Node.js 22.16.0 or newer
- pnpm 11.17.0
- Git

Node.js 24 is used by continuous integration and is the safest choice for a fresh installation.

## 1. Clone the repository

```bash
git clone https://github.com/George-Nizor/discere.git
cd discere
```

GitHub Desktop can be used instead. Open a terminal in the cloned repository before running the remaining commands.

## 2. Enable pnpm

Node includes Corepack on supported releases. Run:

```bash
corepack enable
corepack prepare pnpm@11.17.0 --activate
```

Some Windows installations require an Administrator terminal for `corepack enable`. A non-administrator fallback is:

```bash
npm install --global pnpm@11.17.0
```

Confirm the installation:

```bash
pnpm --version
```

## 3. Run the setup command

```bash
pnpm run setup
```

The setup command:

1. checks the Node.js and pnpm versions
2. creates `.env` from `.env.example` when needed
3. installs all workspace dependencies
4. creates and migrates the SQLite database
5. seeds the initial electronics concept graph
6. builds the browser application
7. runs the environment doctor

It preserves an existing `.env` file and an existing database.

## 4. Start Discere

For the built prototype:

```bash
pnpm start
```

For development with automatic reload:

```bash
pnpm dev
```

The command prints the active URLs. With the default configuration, open:

```text
http://127.0.0.1:4318
```

The API is available at:

```text
http://127.0.0.1:4317
```

Press `Ctrl+C` in the running terminal to stop both services. When the original terminal was closed unexpectedly, run:

```bash
pnpm stop
```

Discere records only the process IDs it started and uses that record for cleanup.

## 5. Verify the installation

Run the complete local verification sequence:

```bash
pnpm verify
```

This performs:

- environment diagnostics
- linting
- strict TypeScript checks
- unit and component tests
- curriculum validation
- a production web build
- a temporary full-stack smoke test

The smoke test starts isolated services on free ports with a temporary database. It verifies the web preview, API proxy, single-origin serving of the built bundle, learner-safe lesson response, deterministic SVG, prose gate, notebook round trip, the workings review through the offline provider, the per-course review queue, and numeric assessment. The temporary data is deleted when the check finishes.

`pnpm build` also runs `scripts/check-csp.mjs` over `apps/web/dist`. It refuses a bundle that would fail the Content Security Policy the Instrumenta launcher applies: no inline script, no external script, stylesheet, or font, and no request to another origin. Run it alone with `pnpm check:csp`.

For a faster environment-only check:

```bash
pnpm doctor
```

## Configuration

The first setup creates `.env`. Supported fields are:

| Variable | Default | Purpose |
| --- | --- | --- |
| `DISCERE_HOST` | `127.0.0.1` | API bind address. The prototype accepts loopback hosts only. |
| `DISCERE_PORT` | `4317` | API port. |
| `DISCERE_WEB_HOST` | `127.0.0.1` | Web bind address. The prototype accepts loopback hosts only. |
| `DISCERE_WEB_PORT` | `4318` | Web interface port. |
| `DISCERE_DATABASE_PATH` | `./data/discere.sqlite` | SQLite database location. A relative value resolves from the repository root, not from the working directory, so every command reads the same file. An absolute path is used as given. |
| `DISCERE_LEARNER_NAME` | `Learner` | Name displayed in the local profile. |
| `DISCERE_TUTOR_PROVIDER` | `companion` | How a tutor reply is produced. `companion` writes a packet you paste into ChatGPT, `codex` spawns the local Codex CLI and generates in place, and `mock` returns fixed offline text. |
| `DISCERE_CODEX_BIN` | `codex` | Executable used by the `codex` provider. |
| `DISCERE_CODEX_MODEL` | account default | Model passed to the CLI. Leave unset to use the account default. |
| `DISCERE_CODEX_EFFORT` | `low` | Reasoning effort passed to the CLI. |
| `DISCERE_CODEX_SCRATCH` | `~/.local/share/discere/codex-scratch` | Working root handed to the CLI. It is created on demand and sits outside the checkout so the CLI never ingests the repository's `AGENTS.md`. |
| `DISCERE_TUTOR_ASK_TIMEOUT_MS` | `45000` | Wall-clock budget for one tutor question. |
| `DISCERE_TUTOR_ASSESS_TIMEOUT_MS` | `120000` | Wall-clock budget for one essay assessment or workings review. |
| `DISCERE_WEB_ROOT` | unset | Directory holding the built browser bundle. When set, the API serves the interface from its own origin instead of leaving it to Vite. A relative value resolves from the repository root. |
| `DISCERE_AUTO_MIGRATE` | unset | `1` applies pending migrations at boot. A launcher that has never run `pnpm db:migrate` needs it; a normal local install does not. |
| `DISCERE_URL` | `http://127.0.0.1:49323` | Where the MCP server in `mcp/` looks for a running Discere. Set it when the API is on another port. |

After changing a port, stop and restart Discere. The Vite proxy and API CORS configuration use the same environment values.

## Local generation through the Codex CLI

Setting `DISCERE_TUTOR_PROVIDER=codex` lets Discere answer tutor questions and assess submitted teach-backs without a copy-and-paste step. It spawns the [Codex CLI](https://github.com/openai/codex), which signs in with your own ChatGPT subscription, so no API key is stored in `.env`.

The CLI runs read-only inside `~/.local/share/discere/codex-scratch`, with a JSON Schema constraining its reply and a wall-clock limit in the parent process. One generation runs at a time. A generated reply passes the same validation as a pasted one: the writing gate, the answer-leak check for Coach and Assisted modes, and the source allowlist. A reply that still breaks the writing contract after one targeted repair is reported as a failure rather than shown.

```bash
codex --version   # confirm the CLI is installed and signed in
```

Leaving `DISCERE_TUTOR_PROVIDER` unset keeps the copy-and-paste workflow described in [`chatgpt-companion.md`](chatgpt-companion.md).

## Database schema

Every table is declared in `apps/server/src/db/schema.ts` and created by an ordered SQL file in `apps/server/drizzle/`. Applied files are recorded in the `schema_migrations` table.

```bash
pnpm db:migrate
```

The command is idempotent, so it can be run against an existing database after pulling new work. The server does not create tables while serving requests: starting it against a database with outstanding migrations fails with the list of missing files instead of quietly building an empty schema.

## Local files

The following files are created locally and ignored by Git:

```text
.env
data/discere.sqlite
data/discere.sqlite-shm
data/discere.sqlite-wal
apps/web/dist/
node_modules/
.discere-pids.json
```

The SQLite file contains the local profile, XP, concept mastery, attempts, assistance events, answer-reveal records, writing-gate runs, notebook pages, journey progress, essay drafts, review cards, review sessions, transfer attempts, and the applied-migration record.

### Back up learning state

Stop Discere, then copy these files together:

```text
data/discere.sqlite
data/discere.sqlite-shm
data/discere.sqlite-wal
```

SQLite may not create the `-shm` and `-wal` files until the application has run.

### Reset learning state

This permanently removes local progress.

PowerShell:

```powershell
pnpm stop
Remove-Item .\data\discere.sqlite* -Force -ErrorAction SilentlyContinue
pnpm db:migrate
pnpm db:seed
```

macOS or Linux:

```bash
pnpm stop
rm -f data/discere.sqlite*
pnpm db:migrate
pnpm db:seed
```

## Troubleshooting

### `pnpm` is not recognized

Run either:

```bash
corepack enable
corepack prepare pnpm@11.17.0 --activate
```

or:

```bash
npm install --global pnpm@11.17.0
```

Close and reopen the terminal if the command remains unavailable.

### `better-sqlite3` fails to load

Use Node.js 22.16 or newer, preferably Node.js 24, then reinstall:

```bash
rm -rf node_modules
pnpm install --force
pnpm doctor
```

On PowerShell, replace the first command with:

```powershell
Remove-Item .\node_modules -Recurse -Force
```

The repository explicitly permits the native build scripts required by `better-sqlite3` and `esbuild`.

### Port 4317 or 4318 is occupied

Run:

```bash
pnpm stop
pnpm doctor
```

When another application owns the port, edit `.env` and choose unused values for `DISCERE_PORT` and `DISCERE_WEB_PORT`.

### `pnpm start` says the web bundle is missing

Build it first:

```bash
pnpm build
pnpm start
```

`pnpm run setup` performs this build automatically.

### The browser cannot reach the API

Confirm both services were started by the same `pnpm dev` or `pnpm start` command. Then run:

```bash
pnpm doctor
```

Avoid starting the web and API packages separately unless you are debugging them.

### A stale process record remains

Run:

```bash
pnpm stop
```

The next start also removes a stale PID record when none of its recorded processes are running.

## Running Discere from Instrumenta

Discere ships an Instrumenta product manifest at `instrumenta/product.json`. The launcher owns
the whole lifecycle, so nothing below has to be done by hand once Discere is registered in
Instrumenta's catalogue.

The launcher prepares the checkout with `pnpm install --frozen-lockfile` followed by
`pnpm run build`, which builds every workspace package, the browser bundle, and the MCP server
in `mcp/`. It then spawns `pnpm --filter @discere/server start` with `PORT` set to the port it
picked, `HOST=127.0.0.1`, and the manifest's own environment:

```json
{
  "DISCERE_WEB_ROOT": "apps/web/dist",
  "DISCERE_AUTO_MIGRATE": "1",
  "DISCERE_TUTOR_PROVIDER": "codex"
}
```

`DISCERE_WEB_ROOT` is what makes the single window work: the API serves the built interface from
its own origin, so the launcher's `connect-src 'self'` policy allows the interface to reach the
API. `DISCERE_AUTO_MIGRATE=1` lets a first launch create the schema without a separate
`pnpm db:migrate`. The launcher then polls `GET /api/health` for up to thirty seconds; the
server registers no routes until the content has loaded and the database has passed its
migration check, so an answer there means Discere can actually serve a lesson.

Registered port `49323`, falling back to `45023`. Closing the window stops the whole process
tree.

The launcher applies its own Content Security Policy and replaces any header Discere sent. The
policy allows `'self'` only, plus inline style and `data:`/`blob:` images. `pnpm build` checks
the bundle against it, so a dependency that starts reaching for a CDN fails the build rather
than the window.

### The MCP server

`mcp/` is a small workspace package that speaks the Model Context Protocol over stdio. It is a
thin client of the HTTP API, so Discere must be running for its tools to answer; when it is not,
each tool says so and names the URL it tried rather than inventing content. The base URL comes
from `DISCERE_URL` and defaults to `http://127.0.0.1:49323`, which is the port the launcher
gives Discere. Running Discere on its development port instead means setting `DISCERE_URL` to
match.

```bash
pnpm --filter @discere/mcp build
node mcp/dist/index.js   # speaks JSON-RPC on stdin and stdout
```

The agent skill that documents these tools lives in `ai/skills/learn-with-discere/`.

## ChatGPT companion workflow

The prototype does not use paid OpenAI API calls. The current companion workflow prepares structured text that can be copied into a ChatGPT conversation. Returned structured content is validated before it can enter the learning system.

The full ChatGPT-native MCP interface remains isolated behind an adapter until the required host capabilities are confirmed on the target account.
