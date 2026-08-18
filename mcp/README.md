# @discere/mcp

A Model Context Protocol server for Discere. It speaks MCP over stdio and does nothing but
forward calls to Discere's local HTTP API, so an assistant reads the same courses, progress and
feedback the learner sees in the app.

## Running it

The server is built to `dist/index.js` and starts its transport as soon as that file is loaded,
whether it is executed or imported. It keeps no state and reads no files, so the working
directory it runs from does not matter.

```sh
pnpm --filter @discere/mcp build
node mcp/dist/index.js          # from the repository root
```

The Instrumenta hub resolves `<productRoot>/mcp/dist/index.js` and imports it in process with the
working directory set to the Discere root. `pnpm run build` at the Discere root builds this
package along with the rest of the workspace, so no separate step is needed.

## Configuration

| Variable      | Default                  | Meaning                                     |
| ------------- | ------------------------ | ------------------------------------------- |
| `DISCERE_URL` | `http://127.0.0.1:49323` | The base URL of the running Discere server. |

`DISCERE_URL` is read on every request, so a launcher can set it after loading the module.
Requests time out after 15 seconds.

## Tools

| Tool                   | Input                                                        | Discere endpoint                                        |
| ---------------------- | ------------------------------------------------------------ | ------------------------------------------------------- |
| `list_courses`         | none                                                          | `GET /api/courses`                                      |
| `get_course`           | `courseId`                                                    | `GET /api/courses/:courseId`                            |
| `get_lesson_journey`   | `courseId`, `lessonId`                                        | `GET /api/courses/:courseId/lessons/:lessonId/journey`  |
| `get_progress`         | none                                                          | `GET /api/home`                                         |
| `list_due_reviews`     | none                                                          | `GET /api/review`                                       |
| `ask_tutor`            | `lessonId`, `question`, `mode`, `conceptIds?`, `sessionId?`   | `POST /api/tutor/ask`                                   |
| `get_attempt_feedback` | `questionId`, `response`, `mode`, `attemptId?`                | `POST /api/attempts`                                    |

The first five only read. `ask_tutor` and `get_attempt_feedback` write: they record assistance
and attempts against the learner, which is why they are not marked read-only or idempotent.

`ask_tutor` accepts `coach`, `assisted` and `direct`. Exam mode is missing on purpose: Discere
answers a tutoring request made during an exam with `403 EXAM_GUARDRAIL`, so the tool refuses it
here and says why. `get_attempt_feedback` does accept `exam`, because attempts are marked in
every mode.

`ask_tutor` has two outcomes and reports both as they come. `status: "answered"` carries the
reply, whether Discere accepted it, and any issues it raised. `status: "packet_required"` means
the configured provider cannot answer in place and returns `packet.text` for the learner to paste
into ChatGPT.

Review card fronts and backs are deliberately absent. `list_due_reviews` reports counts only, and
no tool here reveals a card: reviewing happens in Discere, where the reveal is recorded.

## Failures

Nothing is invented. When Discere is not running, every tool returns an error result naming the
URL it tried and how to start Discere. When Discere answers with a non-2xx status, the tool
reports the status along with the `code` and `message` from the body. Failures come back as
`isError` tool results rather than protocol errors, so the caller can read the reason and relay
it.

## Checks

```sh
pnpm --filter @discere/mcp typecheck
pnpm --filter @discere/mcp test
```

`test` builds first, then runs a stdio smoke test that launches `dist/index.js`, completes the
MCP handshake, lists the tools, and calls one against an address where nothing is listening to
confirm the failure is honest.
