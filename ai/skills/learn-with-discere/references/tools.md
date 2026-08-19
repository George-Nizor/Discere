# Discere MCP tool map

## Find your way around

| Tool | Use |
| --- | --- |
| `list_courses` | List every course with its id, title, description, lesson count, available lesson ids, and last active time. |
| `get_course` | Read one course's lessons and concepts with their titles and summaries. |
| `get_lesson_journey` | Read the learner-safe ordered stage list for one lesson. |

## See where the learner stands

| Tool | Use |
| --- | --- |
| `get_progress` | Read the learner name, XP, day streak, current mission, and per-concept mastery. |
| `list_due_reviews` | Read the due card total, the estimated minutes, and the per-course breakdown. |

## Work through a question

| Tool | Use |
| --- | --- |
| `ask_tutor` | Ask Discere's own tutor in `coach`, `assisted`, or `direct` mode and relay the reply, its issues, or the paste packet. |
| `get_attempt_feedback` | Submit the learner's answer and return the marked feedback, XP, mastery, and independence. |

Every tool is a thin wrapper over Discere's local HTTP API, so the Discere server must be running; the default base URL is `http://127.0.0.1:49323`, overridable with `DISCERE_URL`, and a failure names the URL it tried rather than inventing content. The first five tools only read. `ask_tutor` and `get_attempt_feedback` write, recording assistance and attempts against the learner. Tutoring modes are binding and fixed for the life of an attempt; `ask_tutor` refuses `exam`. Answer authority and flashcard backs never cross the boundary, so no tool returns them and none may be reconstructed.
