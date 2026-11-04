# Brief for the fix pass: introductions, openers and question screens

George started learning from the new courses and found four faults that make them hard to use.
You are fixing those four faults in one course. Leave everything else as it is: the teaching
screens, figures, worked examples, skill checks, recaps and cards are not part of this pass,
except where a fault below sits inside them.

Read first, once: `.claude/skills/discere-lesson-voice/SKILL.md` and the reference examples for
your course's voice in `.claude/skills/discere-lesson-voice/references/`. The approved openers
there are the standard. Then read the worked example at the end of this brief, which is lesson 1 of
Software Design and Architecture before and after this pass.

To see a course or a lesson as a learner reads it:

```bash
node scripts/lesson-text.mjs <course>              # the course introduction and lesson list
node scripts/lesson-text.mjs <course> <lesson-id>  # one lesson, screen by screen
npx tsx scripts/voice-check.ts <course>            # every rule, including the ones below
```

## The four faults

### 1. The course introduction is a syllabus

Most introductions walk through the course ("You begin with…", "The middle lessons…", "The
course ends with…"). The course page already shows the lessons in order, so this tells the
learner nothing. Rewrite `course.introduction.paragraphs` as two or three paragraphs that
introduce the subject itself, in the course's voice, as the approved openers do: start from the
subject's own material, say what the subject is, and say what it lets you do or see that you could
not before. Do not list topics or lessons, and do not promise anything the course does not do
(such as running code it only shows). No emphasis marks. `voice-check` reports a syllabus
paragraph as `INTRODUCTION_IS_A_SYLLABUS`.

### 2. Lesson openers that stage a scene or talk about themselves

Compare each opener (`intro.hook.blocks`) with the approved openers. Those start on the real
thing (an equation, a star's distance, an argument), say what it is and what it means, and say
why it matters through what it lets you do, in two connected paragraphs. Rewrite an opener that:

- stages a scene or vignette ("A project can receive two renames on the same morning…", "Imagine
  a team…", an invented character);
- describes its own figure or itself ("The figure shows…", "the gap between them is the point");
- ends on a moral or announcement instead of the subject;
- gives away the answer to the lesson's first question;
- reads as short separate statements rather than connected sentences.

An opener that already reads like the references stays as it is. Keep every fact and number you
keep, keep `**bold**` at the term the opener names, and do not add a fact you cannot support. Do
not change `promise` or `whyItMatters` unless one repeats the opener word for word.

### 3. Question screens that tell the setup twice

On a screen with a question, the player shows the lead and then the question. In many lessons the
lead retells the question's setup and the question tells it again, which reads as two paragraphs
saying the same thing. The question must stand alone (it is also shown in review), so the setup
belongs in the question. For each such screen:

- usually delete the lead (`"lead": []`): a screen with a question needs no other text;
- or cut it to the one thing the question does not say, such as a sentence that links the screen
  to the previous one or a fact the question needs;
- never leave an instruction about answering ("Work out … before you read on", "Apply the test
  from the last screen", "Try this one", "Use what you have just seen").

`voice-check` reports these as `LEAD_REPEATS_QUESTION` and `FILLER_INSTRUCTION`; it cannot see
coaching instructions that use other words, so read every lead on a question screen.

### 4. Questions of the wrong type

There was a rule capping multiple choice at 35% of a course, and writers met it by turning
conceptual checks into counting puzzles ("How many programs have to change in total, counting the
service?" with the answer 13). That rule is gone. Choose the type that tests the idea:

- **choice** when the learner has to judge between options: classify a decision, pick the
  principle that applies, say which design fails and how;
- **number** when the skill is the calculation itself;
- **single term** when the skill is recalling a name.

Change a question when its number or term tests something other than the lesson's idea (whether
you remembered to count one more item, a word you could only guess). Keep its `id` when it still
asks essentially the same thing, so learners' history stays attached; otherwise give a new id
`<prefix>-<lesson-id>-<slug>` and point the step at it. A choice question has 3 or 4 options, ids
`a` to `d`, a text `answerAuthority` whose `acceptedIdeas` holds the correct label exactly, a
`misconceptions` entry for every wrong option (fact and reason, no verdict words), an `onCorrect`
line and at least one hint. Vary where the correct option sits. Remove a numeric question's
`transfer` when it becomes a choice. Leave a well-made numeric question alone.

## How to work

1. `node scripts/lesson-text.mjs <course>` and rewrite the introduction.
2. For each lesson in order: read it with `lesson-text.mjs`, then make the edits for faults 2 to 4
   with a short Node script that loads `content/<course>/bundle.json`, changes the fields, and
   writes it back with `JSON.stringify(bundle, null, 2) + "\n"`. Keep scratch scripts in
   `.author/<course>/fix/`.
3. After each lesson, run `voice-check` and read the lesson again with `lesson-text.mjs` as a
   learner would, top to bottom. Fix anything that now reads badly, such as a teaching screen that
   says "the last question" when that question has moved.
4. At the end: `npx tsx scripts/voice-check.ts <course>` reports 0 errors and
   `npx tsx scripts/check-course.ts <course>` loads the course. For a course with SQL figures, run
   `python3 -I scripts/check-sql-figures.py <course>`. For rust-foundations, run
   `pnpm -s rust:prepare` and leave every code question's code untouched.

Touch only `content/<course>/` and `.author/<course>/`. Do not commit, do not edit code, and do not
run the test suites. Other agents are fixing other courses at the same time.

## Report (under 200 words)

The new introduction in full; the number of openers rewritten, leads cut and questions changed;
and the opener you are least happy with, by lesson id.

## Worked example: Software Design and Architecture, lesson 1

**Introduction, before** (three paragraphs, two of them a syllabus):

> … You begin with measurements that need no vocabulary beyond arithmetic, such as the number of
> links between modules… Each idea is then tried on short Python… The middle lessons take the
> design principles and patterns that most teams use… The later lessons compare a modular monolith
> with microservices…

**After:**

> A program that works today can still be hard to change tomorrow, and over the life of most
> software the cost of changing it is the larger cost. Some decisions are cheap to revisit, such as
> the name of a variable inside one function, while others become expensive the moment other code
> depends on them, such as the shape of the data a service sends out or the rule about which module
> may call which. Software architecture is the study of that second kind of decision, and of how to
> make such decisions deliberately, knowing what each one gives up.
>
> The subject has a reputation for diagrams and vocabulary, yet most of its questions can be
> settled with arithmetic and a careful look at code. Counting the links between two modules tells
> you how far a change in one will spread, multiplying the availabilities of the services in a
> chain tells you how often the chain will fail, and asking how many programs read a field tells
> you what renaming it will cost. Every principle and pattern you meet here is judged in the same
> way, by what it costs and what it buys in a system you can see.

**Opener, before:**

> A project can receive two renames on the same morning. In one, a variable called tmp inside a
> billing function becomes total; in the other, a field called cust in the data a service returns
> becomes customer_id. … The figure shows the two cases side by side, and the gap between them is
> the point, because the decisions that cost the most to change are the ones that architecture is
> about.

**After:**

> Here are two renames of the same size. Inside a billing function, a variable called tmp becomes
> total, and in the JSON that a customer service sends out, a field called cust becomes
> customer_id. Each is a change of a few characters in a single file.
>
> The first is finished as soon as it is saved. The second can take weeks, with a new version of
> the service, a notice to other teams and a period in which both names have to be supported,
> although the edit itself is no larger. What makes one decision so much dearer to undo than
> another is the question **software architecture** is built on, and the answer lies in what else
> has been written on the assumption that the decision will not change.

**Predict screen, before:** a lead retelling the setup ("A service returns a customer record as
JSON… Twelve other programs read that field… Work out how many programs have to change before you
read on.") above a numeric question asking the same thing, answer 13.

**After:** no lead, and a choice question that tests the idea: "A service returns a JSON field
called cust, and twelve other programs read it. The field is renamed to customer_id and the old
name is dropped. What has to change?" with the options *only the service*, *the service and all
twelve programs that read the field*, *only the twelve programs*, and *nothing, as long as
everything is redeployed on the same day*, each wrong option answered with the reason.

**Try screen, before:** "Apply the test from the last screen. Ask, for each change in the list, how
many other things must move if it is undone." above the question. **After:** no lead.
