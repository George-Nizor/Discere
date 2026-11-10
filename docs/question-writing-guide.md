# Writing questions for a humanities course

This guide describes how the questions of `content/history/bundle.json` were rewritten in
November 2026, so that the same work can be done on another humanities course from a pack of
fetched sources. History is the model: read a few of its lessons in the app before starting.

It covers questions, their hints and feedback, and the review cards that go with them. Teaching
screens stay as they are, apart from a sentence that sets up a question you have replaced.

## What changed in History

The course had 139 questions, 34 of which no lesson asked. Of the 105 in use, 24 were numeric,
and most of those were date subtraction ("How many days are there from 28 June to 4 August
1914?"). No question showed the learner a source.

After the rewrite there are 105 questions: 77 multiple choice, 20 short text and 8 numeric.
38 were replaced, 13 revised in place and 54 kept. 22 of them put a real extract in front of
the learner, from 15 public-domain sources. The 34 unused questions were deleted. Every end
check now mixes two question types.

## Before you write

1. Read `docs/holistic-review-2026-11.md` (the teaching sections) and the `discere-lesson-voice`
   skill.
2. Read every lesson of the course as a learner, with its questions. A dump script helps: print
   each step's text, each question with its options, answer, hints and feedback, and the end
   check. Note what each lesson promises.
3. Run `node scripts/content-lint-report.mjs --out <file>` and keep the course's findings.
4. Sort the questions into three piles. Keep a question that asks for the lesson's judgement
   on a clear case. Revise one whose idea is right and whose options, hints or wording are
   weak. Replace one that tests arithmetic, recall of a date, or a term with no case attached.

## Sources and extracts

Fetch each source yourself and keep the fetched page beside your scripts. Use Project
Gutenberg, Wikisource, the Avalon Project, the Fordham sourcebooks, LacusCurtius, and archive
or library pages. A translation has to be in the public domain too, so prefer one published
before 1929 and say whose it is.

- Quote word for word. Have your script find every extract in the fetched text and stop if one
  is missing. Remove only note numbers and page markers.
- Keep an extract between about 20 and 80 words. One sentence is often enough.
- Take a run of consecutive words. If you need two parts of a text, show them as two extracts.
- Never invent a quotation, and never put words in a real person's mouth. If no real extract
  fits, write the question about an invented case that is plainly invented ("A factory owner's
  rule book fines workers for singing").
- State facts about the source (author, date, translator, who it was written for) only if the
  fetched page or the lesson's existing sources give them.
- Add a source record for each page: title with translator and year, publisher, address,
  `licence` beginning "Public domain", `section`, a note saying what is quoted, and
  `checked: {status: "verified", at: <today>}`. Put its id in the question's `sourceIds`, the
  lesson's and the course's.

An extract goes in the prompt as a paragraph whose lines begin with `> `. The app sets it apart
as a quotation, with the setup above it and the question in bold below:

```text
The Res Gestae opens with these words, in the Loeb translation of 1924.

> At the age of nineteen, on my own initiative and at my own expense, I raised an army by
> means of which I restored liberty to the republic, which had been oppressed by the tyranny
> of a faction.

What is this sentence best evidence of?
```

The last paragraph must be the question and end with a question mark. Two accounts can be set
one after the other, each with a line above it saying whose it is. Course checks
(`courseChecks`) do not render extracts yet, so keep them out of those.

## What to ask about a source

Ask what the extract can and cannot show. The useful questions are few:

- Who is speaking, to whom, and what do they want from that reader?
- What is this good evidence of, and what is it weak evidence of?
- Which part could the author know, and which part is the author's judgement?
- Whose voice is missing?
- Is this a fact claim, a piece of evidence or an interpretation?
- What would corroborate it, and would a second source be independent?
- What does it show that its author never meant to show?

## Multiple choice

Write each wrong option from a mistake people really make, and say in its feedback what the
mistake is. The ones that recur in history:

- taking a source's claim as fact;
- treating a biased source as useless;
- taking sequence for cause;
- explaining an event by one cause, or calling it inevitable;
- reading a later idea back into an earlier time;
- treating a silence as proof that nothing happened;
- counting copies as corroboration.

Keep the options alike in form and length. The right option must not be the longest by more
than a quarter, and across a lesson it should sit in different positions. Three options are
enough when there are three real mistakes. Feedback states the fact and the reason, with no
"Correct" or "Not quite".

Before:

> Put these in date order: Ninety-five Theses; Hus burned; Luther at Worms; Gutenberg Bible.
> (four orderings as options)

After:

> A chronicle records that a comet appeared in March and that the king died in April, and it
> concludes that the comet brought about his death. What is wrong with the reasoning?
>
> - Nothing is wrong, since the cause came before the effect
> - It takes an earlier event for a cause with no link shown
> - It is a chronicle, so nothing in it can be relied upon

The first wrong option is sequence taken for cause. The third is bias taken for uselessness.

## Short text

Use short text where a fair answer is a word or a short phrase that the prompt does not
contain: the name of an idea applied to a new case ("hostile source", "counterfactual",
"oral evidence"), or one of a few kinds the lesson taught ("condition", "interpretation").

- Attach a case. "What do we call evidence that points the other way from a claim?" became
  "She then finds that the district which suffered most had normal rainfall that year. What
  does the lesson call a finding of this kind?"
- List the forms a right answer takes in `acceptedAlternatives` (up to twelve), and add
  `misconceptions` with `textIdeas` for the likely wrong terms, each with feedback.
- Do not ask the learner to pick a word out of the extract. The marker accepts any answer that
  contains the phrase, so pasting the prompt back would pass.
- Test the marking. Run `assessTextAnswer` on four or five likely right answers and as many
  wrong ones, and on the prompt itself.

## Numeric

Keep a number only where the number is the historical point and the reasoning is historical:
an interval that tests a claim ("just over five centuries"), a count of independent accounts,
the range that an assumption allows. History has eight, five of them in the lesson on dates.
Give three hints, and never make the last one the bare sum.

Before:

> A survey records 1,500 households. At 5 people per household, how many people is that?

After:

> A muster roll names 600 men able to fight in a town. A historian assumes that such men were
> between a fifth and a quarter of all the people. What is the largest population that fits
> her assumption?

## End checks

Each lesson ends with three questions. Use at least two types, and apply the lesson's idea to
a case the lesson did not use. One of the three is usually an extract.

Before, in the lesson on Magna Carta:

> How many years from the sealing of Magna Carta in 1215 to its confirmation in 1297?

After:

> In 1628 the English Parliament addressed the Petition of Right to Charles I. One of its
> clauses reads: (the clause that cites the Great Charter). What is this clause evidence of?
>
> - What the barons at Runnymede meant by the charter in 1215
> - How Parliament used the charter against a king in 1628
> - That the charter had protected every subject since 1215

## Hints

Two hints are enough for a judgement, three for a calculation. A hint asks the question the
learner should be asking ("Who is he writing to, and what does he want from that reader?").
It never gives a first letter and never repeats the answer.

## Ids and references

- A question revised in place keeps its id. A replaced question gets a new id.
- Update the step's `checkQuestionId` or the lesson's `questionIds`, rewrite the step's
  `reveal` so that it fits the new question, and edit any sentence on a teaching screen that
  set up the old one.
- Delete a replaced question from the bundle. Nothing may be left that no lesson asks.
- Replace a review card that drilled the old question's arithmetic, and give it a new id.
- New questions take a `skill` the lesson already teaches.

## Prose

Follow the `discere-lesson-voice` skill. Plain sentences, no dashes outside quotations, no
slogans. Quotations keep their own punctuation and spelling.

## Checks to run

1. Your apply script: every extract found word for word in its fetched page.
2. `npx tsx scripts/validate-content.ts`: no errors, and no warning the course did not have
   before.
3. `pnpm --filter @discere/curriculum test`. `marking-against-content.test.ts` checks that one
   option is right on every multiple-choice question. `history-questions.test.ts` holds the
   rules of this guide for History; copy it for the new course.
4. `node scripts/content-lint-report.mjs` again, and compare the course's row with the one
   you kept.
5. If the course has `review/publication.json`, rebind it with `scripts/rebind-review.ts`.
6. Play one rewritten lesson in the app at 1440 and 390 pixels wide and read an extract
   question on each.
7. `pnpm check`.
