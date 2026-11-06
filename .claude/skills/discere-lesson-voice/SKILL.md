---
name: discere-lesson-voice
description: Write or rewrite Discere learner-facing prose (lesson openers, teaching screens, worked examples, answer feedback, recaps, course introductions, question prompts, review cards) in the two voices George approved in November 2026. Use for any lesson writing, course rewrite or new course in this repository. The dialogue tutor uses discere-tutor-voice instead.
---

# Discere lesson voice

Discere's lessons are read, not skimmed. A learner should be able to read a whole screen without
effort, the way they would read a well-edited book, and finish it knowing the idea and why it holds.
George calibrated this voice over four rounds in November 2026 after six earlier attempts produced
prose he found choppy, condescending or unnatural. The approved passages are in `references/`. Read
the examples for the voice you are using before you write anything, and match their rhythm and
density without reusing their sentences.

## The two voices

### Voice A: led by the book

Written prose from a well-edited book on the subject. It is precise, slightly formal, and uses few
contractions. Sentences are full and joined by "because", "so", "which", "since" and "while", so that
each one leads into the next. It opens on the subject's own material: an equation, a measurement, a
real finding. It uses "we" only where a step is genuinely taken together ("That gives us a way to
check…"). It may include one real, verifiable detail from the subject's history when the detail
explains why something is the way it is.

Examples: `references/voice-a-examples.md`.

### Voice B: led by the lecturer

A good lecturer explaining to a class, in the manner of Feynman or Gilbert Strang. It says "we",
asks the question a thoughtful learner would ask next and then answers it in full ("Why write it
with a letter?", "Is it a good argument?"), and allows contractions. It invites the reader to
suppose something and follow the consequence ("Suppose, just for a moment, that…"). It is held to
the same full, connected sentences as voice A, and is no more casual than a good lecture.

Examples: `references/voice-b-examples.md`.

## Which voice to use

Every course has a primary voice. Write a lesson's teaching screens in one voice. Switch voices only
at the points listed here, which keeps the course from sounding monotonous.

| Primary voice | Courses | The other voice may be used for |
| --- | --- | --- |
| A | Maths foundations, calculus, geometry, linear algebra, probability and statistics, physics, chemistry, engineering, electronics, astronomy, biology, CS basics, Python, SQL, Rust | An opener (B) when the lesson starts from a genuine puzzle, a counterintuitive claim or a "how would you…?" question |
| B | Philosophy, logic and reasoning, English reading and rhetoric, psychology, economics | A worked calculation or step-by-step procedure screen (A) |

George's calibration findings, which give the reason for the table: A read best for maths and slightly
better for astronomy; B was clearly better for philosophy, where the question-led opener is "almost
instantly a better hook"; A and B were equally good for psychology. For a new course, choose A when
its ideas are reached through definition, quantity or procedure, and B when they are reached through
a question, an argument or an interpretation.

## Principles for both voices

1. **Given before new.** Start each sentence from something the reader already has, often the end
   of the previous sentence, and end it on the new part.
2. **Connect, don't chop.** Ideas that depend on each other share a sentence. A short sentence is
   allowed when the point really is short ("The shift is tiny."), but never two or three in a row.
   A paragraph that reads like stitched-together bullet points is a failure.
3. **Examples come from the subject.** Use the subject's own material: an equation, a star, an
   argument, a study, a query. Do not frame an idea with a game, journey, party, anecdote or
   invented character ("There is an old parlour game in which…" was rejected). A physical
   demonstration of the same mechanism is allowed, such as the finger held at arm's length for
   parallax, because it is the same geometry and not a story.
4. **One register, for an adult.** Do not explain in baby talk and then jump to technical terms.
   Name a term once, plainly, once the idea it names has been shown, and use it consistently after
   that.
5. **Show, then name.** Describe the thing first, then give its name in bold ("…is called the
   star's **parallax angle**").
6. **Length follows how hard the idea is.** An easy idea is said once, in a few full sentences,
   and the figure shows the rest; a hard idea gets the room it needs. Never restate a point in
   other words or describe in prose what the figure already shows. Shorter means fewer sentences,
   never clipped ones. George tested this in November 2026 and found it reads better: less time
   wasted.
7. **No verdict words in feedback.** State the fact and the reason in one or two connected
   sentences. Do not write "Correct!", "Not quite", "Great job" or "Here's the explanation".

8. **Talk to the reader.** Address the learner as "you" (and, in voice B, "we"), as the approved
   examples do. Do not slide into the impersonal passive ("a number was tested", "machines were
   run"). Every sentence should be one you could say aloud to a learner beside you.
9. **Concrete before abstract.** Open a screen on the actual thing (an equation, a number, a
   star), not on a generalisation about it ("Arithmetic often runs in a direction that hides the
   number being sought" is the rejected style). Say each point once: a paragraph that restates the
   previous one should be cut.

The first full-course pilot (Maths Foundations, Sonnet, November 2026) was rejected as "kind of
bad to read" next to the approved examples, because it was stiff, impersonal, abstract in places
and repetitive. Principles 8 and 9 are the correction.

## Each kind of text

- **Opener.** One or two paragraphs. Start from the subject's own material or, in voice B, the
  question a learner would ask. Say why the idea matters through what it lets you do, not by
  announcing that it is important. Do not give a list of what the lesson covers.
- **Teaching screen.** The core of the lesson: flowing paragraphs that develop one idea, refer
  precisely to the figure beside them, and name terms as they are earned. Its headline is a short
  title naming the topic, two to five words in sentence case with no full stop ("Ohm's law",
  "The base rate", "Fan-out on write"). The paragraphs make the point, so the title never
  summarises it as a sentence, and the first paragraph never repeats the title.
- **Worked or faded example.** Its headline is the problem itself, written as a full sentence,
  and the app sets it as the task in bold body text.
- **Worked example.** Full sentences that narrate the reasoning ("Multiplication comes before
  subtraction, so work out 3 × 5 first"), with each line of working given exactly.
- **Reply to a wrong answer.** Work from the learner's actual answer to the correct fact and the
  reason, so that the reply names the misconception without scolding. Voice A: "A false premise
  makes an argument unsound, but it does not make it invalid." Voice B: "You've found the real
  fault, but it has a different name."
- **Reply to a right answer.** Add the one fact that extends the idea, or say nothing. Never praise
  the learner.
- **Recap.** Two or three connected sentences that restate the idea, written as prose. A run of
  clipped sentences such as "A letter stands for a number. Substitute… calculate…" is the
  rejected style.
- **Course introduction ("About this course").** Flowing paragraphs in the course's primary voice.
  The "You'll be able to" outcomes are the one place where concise bullet points are right.
- **Question prompts and review cards.** Plain and exact. A review card asks for a name, a number
  or a choice. If it asks for an explanation, mark it `recall: "self"`, because explanations cannot
  be marked fairly by keyword.

## Emphasis

George wants emphasis visible on every teaching screen, so that a learner skimming back over a
screen can pick out its terms and its key point. In the first curriculum pilot it was too sparse,
with three bold terms in ten screens.

- **Bold** has two uses. Use it for a term at the moment it is defined, and for the one phrase
  that carries the screen's key point ("the letter stands for **the same number wherever it
  appears**"). Expect one to three bold spans on a teaching screen, and never a whole sentence.
- *Italics* mark stress that changes or sharpens the meaning ("salmon would *have* to fly",
  "*half* the angle means *twice* the distance", "it is a *claim*"), and titles of works. Most
  teaching screens should have one or two.
- **Hover terms.** Write `[[term|short note]]` on a term defined in an earlier lesson or screen
  that a learner might have forgotten. The note says what it means and, where it helps, where it
  was met ("A letter standing for a number. Met in 'What a letter stands for'."). Use one or two
  per screen, only where they help.
- **Code** goes in backticks wherever it appears in prose, prompts, hints, feedback and cards:
  names used in code (`total`, `reshape`, `String`), whole expressions and statements as one span
  (`total = price * 4`, `df.head(2)`), commands with their arguments (`git commit -a`), paths, file
  names and shell variables (`$HOME`). A concept named in English (a list, a commit, a join), a
  product name (Git, Python) and a price ($0.12) stay plain. Never put a code span inside bold, a
  hover term or `$…$` maths, where it would show its backticks.
- **Maths** goes in `$…$`, with no space just inside either `$`. A price is written plainly as
  $0.12: a closing `$` must touch the character before it and must not be followed by a digit, so
  two prices in one sentence never pair up into an equation.
- Never emphasise for decoration. If every sentence has something bold, nothing stands out.

## Facts are fixed

Rewriting changes the prose only. Keep every number, equation, unit, label, citation, answer key
and question id exactly as they are. Check every calculation you write by hand. A historical
detail must be verifiable and attributed precisely, as in "Robert Recorde introduced the equals
sign in 1557". Never put a hidden answer into the text shown before the learner responds.

The app's writing engine (`packages/writing-engine`) no longer decides style. Its style bans
pushed writers towards clipped sentences. Its fact-preservation and answer-leak checks still apply.

## Before you hand text back

Read each screen aloud in your head and check that:

- no two short sentences sit in a row, and no paragraph reads like bullet points;
- there is no framing story, game or invented character;
- the register stays the same from the first sentence to the last;
- every term is shown before it is named, and is bold only at its definition;
- feedback contains no verdict words, and the recap reads as connected prose;
- every number and calculation has been checked.

When rewriting a whole course, write one lesson first and compare it side by side with the
reference examples before writing the rest. The 2026-10 rewrite drifted because only a sample of
courses was read.
