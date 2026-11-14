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

A second pass on 11 November added three question types and used them where they were plainly
better than what was there. Three questions became order questions and three became sort
questions. Five extracts moved out of the prompt into the question's `extracts`, each with an
attribution line, and two of those questions set a pair of sources side by side. The course
now has 72 multiple choice, 19 short text, 8 numeric, 3 order and 3 sort. Most questions should
stay multiple choice and short text: the new types are for the few places described below.

## Before you write

1. Read `docs/content-history.md`, the course's entry in `docs/content-ledger.json` and the
   `discere-lesson-voice` skill.
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

An extract goes in the question's `extracts`, with an attribution in three parts: `who` (the
author and the work, with the translation), `when`, and `kind` (what sort of document it is
and who it was for). The prompt then holds only the setup and the question. The app shows the
setup, the extract with one attribution line under it, and the question in bold:

```json
{
  "prompt": "The Res Gestae opens with this sentence. What is the sentence best evidence of?",
  "extracts": [
    {
      "text": "At the age of nineteen, on my own initiative and at my own expense, I raised an army by means of which I restored liberty to the republic, which had been oppressed by the tyranny of a faction.",
      "who": "Augustus, Res Gestae (Loeb translation, 1924)",
      "when": "written late in his life and set up in Rome after his death in 14 CE",
      "kind": "His own record of his deeds, displayed in public"
    }
  ]
}
```

The attribution reads "Augustus, Res Gestae (Loeb translation, 1924), written late in his life
and set up in Rome after his death in 14 CE. His own record of his deeds, displayed in public."
Write `when` so that it follows a comma and `kind` as a phrase that starts with a capital.
State only what the fetched page or the lesson's sources give. The prompt must end with the
question and a question mark, and it must not repeat the extract.

Extracts work on any question except a code question, and they show in lessons, the skill
check, course checks, review cards and read aloud.

An older prompt may still hold its extract as a paragraph whose lines begin with `> `. The app
shows that as a quotation too, without an attribution line. Use `extracts` for anything new,
and move an old extract across when you revise its question.

## A pair of sources

Two extracts in `extracts` are a pair. They are labelled Source A and Source B, set side by
side on a wide screen and one above the other on a phone, and followed by an ordinary choice or
short-text question. Use a pair when the question cannot be answered from either source alone:
where the two disagree, what the later one adds, which claim of one the other gives reason to
test. If the question is about one source, show one.

- Name the sources in the prompt and the feedback as Source A and Source B, as the screen
  does.
- Keep each extract short. Two extracts of 60 words fill a phone screen before the question.
- A pair is a good end-check question. History has two, both in end checks.

```json
{
  "prompt": "These are two accounts of how Augustus came to power. Which part of Augustus's claim does Source B give a historian most reason to test?",
  "extracts": [
    {
      "text": "I raised an army by means of which I restored liberty to the republic",
      "who": "Augustus, Res Gestae (Loeb translation, 1924)",
      "when": "written late in his life and set up in Rome after his death in 14 CE",
      "kind": "His own record of his deeds, displayed in public"
    },
    {
      "text": "Augustus won over the soldiers with gifts, the populace with cheap corn, and all men with the sweets of repose",
      "who": "Tacitus, Annals (translated by Church and Brodribb)",
      "when": "written about a century after Augustus died",
      "kind": "A history by a Roman senator, written for readers like himself"
    }
  ],
  "choices": [
    { "id": "a", "label": "That Augustus had an army behind him" },
    { "id": "b", "label": "That what he did restored liberty" },
    { "id": "c", "label": "That he rose to power in Rome" }
  ]
}
```

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

## Order

An order question (`responseType: "order"`) gives the learner three to seven items to put in
sequence. Use it where the sequence is the point: the events of a crisis, the steps of a
process, the lines of an argument, dates that cross the BCE and CE boundary. It replaces the
multiple-choice question whose options are four orderings, which can be answered by spotting
one pair. Do not use it for a list whose order is only a convention.

- Write the items in `order.items` in their right sequence. The app deals them in another
  arrangement and never sends the sequence to the browser.
- Use four to six items. Three can be right by chance one time in six.
- Do not start an item with its date unless reading the dates is the skill, as in the lesson
  on dates.
- `answerAuthority` is text with `acceptedIdeas: ["Every item in its place"]` and an
  `exampleAnswer` that gives the sequence in a sentence with the fact that fixes it (the
  dates, or why one step needs the one before). Add `onCorrect` with what the order shows.
- A wrong order is told how many items are in the right place and not which. After the second
  miss, or when the learner asks, the list shows the right order. In an end check there is one
  try, as for every end-check question.

```json
{
  "prompt": "Someone claims that Britain's entry into the war pushed Austria-Hungary to attack Serbia. In what order did these five events of 1914 happen?",
  "responseType": "order",
  "order": {
    "items": [
      "Franz Ferdinand is shot at Sarajevo",
      "Austria-Hungary declares war on Serbia",
      "Germany declares war on Russia",
      "Germany declares war on France",
      "Britain declares war on Germany"
    ]
  },
  "answerAuthority": {
    "kind": "text",
    "acceptedIdeas": ["Every item in its place"],
    "rejectedIdeas": [],
    "exampleAnswer": "The shooting at Sarajevo on 28 June came first. Austria-Hungary declared war on Serbia on 28 July, Germany on Russia on 1 August and on France on 3 August, and Britain on Germany on 4 August."
  },
  "onCorrect": "Britain's declaration came last, a week after Austria-Hungary's, so it cannot have pushed Austria-Hungary to act. Order can rule a cause out and can never rule one in."
}
```

## Sort

A sort question (`responseType: "sort"`) gives four to ten items to place in two to four named
groups: condition, cause and trigger; fact claim, evidence and interpretation; primary and
secondary. Use it when the lesson teaches a set of kinds and the skill is telling them apart
across several cases at once. One item to classify is still a multiple-choice or short-text
question.

- Every group must hold at least one item, and each item belongs to exactly one group. If a
  fair reader could put an item in two groups, reword it or leave it out. Where a kind depends
  on how a statement is used, say the use in the item ("which supports the view that
  survivors gained").
- Give each item an `explanation`: one line saying why it belongs where it does. It is shown
  beside the item once the question has closed, whether the learner was right or wrong.
- Use a case the lesson did not use, and say plainly when it is invented.
- `answerAuthority` is text with `acceptedIdeas: ["Every item in its group"]` and an
  `exampleAnswer` that names each group's items in one sentence.
- A wrong sorting is told how many items are in the right group and not which.

```json
{
  "prompt": "A bread riot broke out in a city on the morning the bakers raised their prices, and a historian lists five things that lay behind it. Which of the lesson's three kinds of factor is each one?",
  "responseType": "sort",
  "sort": {
    "bins": [
      { "id": "condition", "label": "Condition" },
      { "id": "cause", "label": "Cause" },
      { "id": "trigger", "label": "Trigger" }
    ],
    "items": [
      {
        "label": "Bread had been dear for years",
        "bin": "condition",
        "explanation": "It was in place for years without a riot, so it belongs to the background."
      },
      {
        "label": "The weavers' guild had agreed to march if the price rose again",
        "bin": "cause",
        "explanation": "A decision to back the protest pushes it along, as the rulers who protected Luther did."
      },
      {
        "label": "The bakers raised the price again that morning",
        "bin": "trigger",
        "explanation": "It is the one event that set the riot off once everything else was in place."
      }
    ]
  }
}
```

The example shows three of the question's five items.

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
a case the lesson did not use. One of the three is usually an extract. An end-check question
gives one try, so an order or sort question there should be one a learner who followed the
lesson gets right at once.

Before, in the lesson on Magna Carta:

> How many years from the sealing of Magna Carta in 1215 to its confirmation in 1297?

After:

> In 1628 the English Parliament addressed the Petition of Right to Charles I, and one of its
> clauses repeats the charter of 1215 almost word for word. (Source A is clause 39 of the
> charter and Source B the clause of the petition.) What is Source B evidence of?
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
   rules of this guide for History; copy it for the new course. The validator refuses an order
   question with repeated items, a sort question with an unused group or an item in no group,
   and an extract with a part of its attribution missing.
4. `node scripts/content-lint-report.mjs` again, and compare the course's row with the one
   you kept.
5. If the course has `review/publication.json`, rebind it with `scripts/rebind-review.ts`.
6. Play one rewritten lesson in the app at 1440 and 390 pixels wide and read an extract
   question on each. Answer each order and sort question with the keyboard alone.
7. `pnpm check`.
