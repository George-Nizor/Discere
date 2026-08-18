---
name: learn-with-discere
description: Browse, inspect, tutor, mark, and track local Discere courses, lessons, and attempts through the Discere MCP. Use for course and lesson orientation, lesson journey stages, learner progress and concept mastery, due-review counts, mode-bound tutoring, and marked question attempts. Do not use for the drawing notebook, workings review, read-aloud, screenshots, the tutoring-mode selector, or anything else in the browser UI.
---

# Learn with Discere

Discere is a single-learner study workspace that runs on the learner's own machine. Its point is accountability: a lesson is a journey of ordered stages, a tutoring mode is fixed for the life of an attempt, and the answer authority for a question never reaches the learner-facing side. Work inside those rules rather than around them, because helping too much here does not just break a convention, it corrupts the record of what the learner can actually do.

## Start safely

1. Read before acting. Call `list_courses`, then `get_course` for the course in play, then `get_lesson_journey` for the lesson. Two courses ship, `electronics-foundations` and `roman-empire`, but confirm what is installed instead of assuming.
2. Call `get_progress` and `list_due_reviews` before offering to help with anything specific. XP, streak, current mission, per-concept mastery, and what is due tell you whether the learner needs new material or revision.
3. Ask the learner which tutoring mode they are working in: `coach`, `assisted`, `direct`, or `exam`. The mode is fixed for the life of an attempt and the server refuses to change it mid-attempt, so guessing it wrong means either withholding help they are entitled to or leaking help they are not.
4. Never call `get_attempt_feedback` on the learner's behalf unless they asked you to submit. It records a real attempt, moves mastery, and awards or withholds XP.
5. If a tool reports that Discere is not running, relay the URL it names and ask the learner to start Discere. The default is `http://127.0.0.1:49323`, overridable with `DISCERE_URL`. Do not fill the gap with remembered or invented course content.

## Tutor within the mode

- Prefer `ask_tutor` over answering from your own knowledge. Discere's tutor is bound to the lesson's own sources and to the mode, so its reply is checkable against the course; yours is not.
- Honour the mode even when you can work the answer out yourself. `coach` gives questions and hints and no final answer, `assisted` gives partial support and still no final answer, `direct` may state the answer, and `exam` gets no tutor, no hints, no answer reveal, and no workings review at all. `ask_tutor` does not accept `exam`.
- Never reconstruct or guess the answer authority. The worked answer, the accepted ideas, and the numeric tolerances stay server-side and are absent from every learner-facing payload; anything you rebuild from them would be a guess presented as authority. In `coach` and `assisted` mode the server also rejects a tutor reply that leaks the final answer.
- Pass the returned `sessionId` back on the next `ask_tutor` call to continue one conversation rather than starting a fresh one each turn.
- Report the `issues` the server raises alongside the reply. They are the accountability record, and hiding them defeats the feature.
- Relay a `packet_required` result as it comes: the configured provider cannot answer in place, and `packet.text` is for the learner to paste into ChatGPT themselves.

## Practise and review

- Submit through `get_attempt_feedback` only when asked, and pass the mode the learner is actually in. The result carries the marked feedback, XP, mastery, and whether the attempt counted as independent.
- Treat the independence flag as real. Help given before a submission is part of the record, so do not describe a coached answer as unaided work.
- Use `list_due_reviews` for the totals, the estimated minutes, and the per-course breakdown. It never returns card content.
- Do not offer to supply a flashcard back. Backs stay server-side until the learner reveals one in Discere, and no MCP tool returns one.
- Spaced review uses FSRS, and recall that needed help is recorded as assisted evidence that can never earn more than a `hard` grade. Do not encourage rating a card above what the learner actually recalled.

## Report what happened

- State the course, the lesson, and the stage you are working in, so the learner knows where in the journey they are: `explainer`, `interactive_visual`, one `quiz` stage per question, an optional `essay` teach-back, a `review` recap, then `completion`.
- Say plainly when a reply is refused or when the deterministic writing gate rejects generated prose. Report the rejection; never quietly substitute a weaker reply of your own.
- Summarise a session with what was attempted, what the server marked, and what mastery moved. Keep the learner's own words as their answer.
- Discere runs entirely on the learner's machine and nothing is uploaded. Say so if asked, and do not offer to send their work anywhere.

## Respect the boundary

The MCP surface is seven read and write tools over the local HTTP API, and nothing else. The drawing notebook and its workings review, the read-aloud control, screenshots, the tutoring-mode selector, and the rest of the browser UI are interface features with no tool behind them; say they are out of scope instead of improvising a substitute. Read [the tool map](references/tools.md) when choosing between tools or explaining what a call will record.
