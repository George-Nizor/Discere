# Discere on a phone

George wants to learn from Discere on his phone. Discere was built as a desktop service: a Fastify
server with SQLite on the PC, a React web app in front of it, and Instrumenta starting and stopping
the service. This plan covers two routes, written in November 2026 to come back to. Neither has
been started.

- **Route 1, remote:** open Discere on the PC from the phone over a private network. Every feature
  works, but the PC has to be on.
- **Route 2, offline lite app:** an installable web app that holds the courses and works with no PC
  and no signal. The tutor, illustrations and code runners are left out.

The sensible order is route 1 first, because it is close to free, and route 2 when learning away
from the PC matters.

## What the app depends on

The web app talks to the server through about 26 groups of `/api/…` calls, all with relative
paths, so it does not care which machine serves it.

| Server work | Lives in | Can run in a phone browser |
| --- | --- | --- |
| Loading courses and projecting lessons into screens | `packages/curriculum`, `apps/server/src/lesson-projection.ts`, `content.ts` | Yes, it is plain TypeScript |
| Marking answers | `packages/assessment-engine`, `apps/server/src/assessment.ts` | Yes |
| Review scheduling and progress | `packages/progression-engine`, `apps/server/src/db/` (SQLite) | Yes, with IndexedDB in place of SQLite |
| Search, topic maps, learning statistics | `apps/server/src/search.ts`, `topic-maps.ts`, `learning-statistics.ts` | Yes |
| Essays and the writing checks | `packages/writing-engine`, `apps/server/src/routes.ts` | Probably; check whether any essay route calls the tutor |
| Tutor | `apps/server/src/tutor-*.ts`, Claude Code or Codex on the PC | No |
| Generated illustrations | `apps/server/src/illustrations.ts` | No |
| Python, Rust and SQL project runners | `apps/server/src/code-runtimes/`, `rust/`, `python-projects/`, `sql-projects/` | Not as built; SQL and Python could later use sql.js and Pyodide, Rust cannot |

The courses are 44 MB of JSON across 65 bundles, 6.4 MB compressed, which is comfortable for a
phone. The app already has 87 narrow-screen CSS rules, but nobody has read a lesson at phone width
since the option A layout in 1.10.0.

`/api/capabilities` already reports which features are available, and the interface hides controls
it cannot honour. Both routes can lean on that to hide the tutor and runners when they are absent.

## First, for either route: a phone-width pass

1. Screenshot a few lessons at 390 × 844 with the Playwright walker used for releases
   (`look/walkscroll.mjs` in the session scratchpad; `scripts/learner-run.ts` drives the API).
   Cover a teaching screen with a figure, a choice question, a numeric question, a worked example,
   a prompt with a code block, the footer with the feedback panel open, the home screen and a
   review session.
2. Fix what breaks: figure width, the fixed footer and feedback panel, choice rows, code blocks
   (they scroll sideways by design), hover terms (need tap, not hover), the header controls.
3. Check touch targets are at least 44 px and that nothing needs a keyboard shortcut.

## Route 1: reach the PC from the phone

### How it works

Install Tailscale, a free private network, on the Windows PC and the phone. Tailscale Serve then
publishes Discere's local port as a private HTTPS address, such as
`https://<pc-name>.<tailnet>.ts.net`, that only devices signed in to the same Tailscale account can
open. Discere keeps listening only on 127.0.0.1, which it insists on (`apps/server/src/web-server.ts`
refuses any other host), and Tailscale forwards to it, so no change to that safety rule is needed.

### Steps

1. Install Tailscale on the PC and the phone and sign in to the same account. George does this on
   Windows; Claude sessions must not run Windows setups (they land in the Claude app's sandboxed
   storage).
2. Open Discere in Instrumenta and note its port: 49323, or 45023 if that was taken
   (`instrumenta/product.json`, `launch.port`).
3. On the PC run `tailscale serve --bg 49323` and note the address it prints.
4. Open that address on the phone, check a lesson, a question and a review, then add it to the
   home screen.

### The one real problem: the service stops when the window closes

Instrumenta starts Discere when its window opens and stops the process tree when the window closes
(`Instrumenta/docs/product-lifecycle.md`, "Managed service"). So the phone can reach Discere only
while its window is open on the PC. Three ways round it, in order of preference:

- **A launcher setting, "Keep Discere running in the background".** Instrumenta keeps the service
  alive after the window closes and starts it at launcher start. This is an Instrumenta change
  (`electron/` service lifecycle), a few hours of work with tests, and it helps any managed-service
  product.
- **Start the service outside Instrumenta**, as a Windows startup task running the installed
  release's `runtime\node.exe` with the same environment as `launch.env`. Quick, but it bypasses
  the launcher, so two copies could fight over the database if both run.
- **Leave the window open** on the PC. Fine for trying it out.

### Also check

- The PC must not sleep while away, or the phone gets nothing. Windows power settings.
- The Content-Security-Policy and any host check accept the Tailscale hostname.
- Two clients at once (PC window and phone) share one SQLite database; check that a review answered
  on one shows correctly on the other after a refresh.

### Effort

The Tailscale part is under an hour. The phone-width pass is a session. The background setting is a
short Instrumenta change and release.

## Route 2: an offline lite app

### What it is

The same React app built as a Progressive Web App: installed from the browser to the home screen,
with the app and the courses cached on the phone, and progress stored in the browser's IndexedDB.
It does lessons, figures, questions, marking, worked examples, reviews, search and the notebook. It
has no tutor, no illustration generation and no code runners, and `/api/capabilities` says so, so
those controls do not appear.

### Design

- **A local backend in the browser.** Add a build mode in which `apps/web/src/api/` calls an
  in-browser implementation of the endpoints the lite app needs, instead of `fetch`. The
  implementation reuses `packages/curriculum`, `assessment-engine` and `progression-engine`
  directly, so marking and scheduling are the same code as the desktop app.
- **Move shared logic out of the server.** Some of what those endpoints need lives in
  `apps/server/src` (`lesson-projection.ts`, `assessment.ts`, `learning-statistics.ts`,
  `search.ts`, `topic-maps.ts`). Move it into packages that both the server and the local backend
  import, so the two never drift.
- **Storage.** An IndexedDB schema mirroring the SQLite tables the lite endpoints touch: attempts,
  review state, progress, notebook.
- **Courses on demand.** Ship each course's bundle as its own static file and fetch it when the
  course is opened, so first install stays small, then cache it for offline use.
- **Answers stay private.** The desktop server never sends answer keys to the browser
  (`LearnerQuestionSchema` omits them). The lite app has to hold them to mark offline. That is fine
  for a personal app; it is the reason the lite build must not be published openly.

### Hosting

The phone has to load the app once. Options:

- **Serve it from the PC over Tailscale once**, install it, and from then on it runs offline. No
  public hosting at all. This pairs well with route 1.
- **Cloudflare Pages behind Cloudflare Access** (free, login required) for installing without the
  PC.
- GitHub Pages only if the repository and content can be public, which the answer keys argue
  against.

### Progress between phone and PC

The first version keeps phone progress separate. Later options, simplest first: export and import a
progress file; sync with the PC's database when the phone can reach it over Tailscale (merge by
attempt, newest review state wins).

### Steps

1. List every endpoint the web app calls and mark each local, dropped or later.
2. Move the shared server logic into packages, with the server switched over and its tests green.
3. Write the local backend and the IndexedDB store, behind a build flag.
4. Add the PWA manifest, icons from `brand/`, and a service worker that caches the app shell and
   opened courses.
5. Run the phone-width pass on the lite build, and the web unit tests and a mobile e2e subset
   against it.
6. Choose hosting, install on the phone, and use it offline for a week before calling it done.
7. Later: progress sync; SQL and Python practice through sql.js and Pyodide.

### Effort

Three to five sessions for steps 1 to 6.

## Decisions to make when we pick this up

- iPhone or Android. iPhone installs web apps from Safari and can clear their storage if the app
  goes unused for weeks; Android is more relaxed. Route 2 should ask the browser for persistent
  storage either way.
- Whether the PC is usually on, which decides how much route 1 is worth.
- Whether phone progress must match the PC's from the start, or can begin separate.
- Which missing features matter most offline: probably the Python and SQL runners first.
