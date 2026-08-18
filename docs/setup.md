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

The smoke test starts isolated services on free ports with a temporary database. It verifies the web preview, API proxy, learner-safe lesson response, deterministic SVG, prose gate, notebook round trip, and numeric assessment. The temporary data is deleted when the check finishes.

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

After changing a port, stop and restart Discere. The Vite proxy and API CORS configuration use the same environment values.

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

## ChatGPT companion workflow

The prototype does not use paid OpenAI API calls. The current companion workflow prepares structured text that can be copied into a ChatGPT conversation. Returned structured content is validated before it can enter the learning system.

The full ChatGPT-native MCP interface remains isolated behind an adapter until the required host capabilities are confirmed on the target account.
