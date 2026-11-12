#!/usr/bin/env node
// Content lint report: reads every content/<course>/bundle.json, prints how many questions in
// each course break each rule below, and with --out writes every offender to a JSON file.
// It only reads content and is not part of `pnpm check`; the rules are advice for authors.
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RULES = {
  "misconception-in-band": "A numeric misconception value lies inside the accepted tolerance band.",
  "places-tolerance":
    "The prompt asks for n decimal places or significant figures, and the tolerance is below half a unit or above one unit in that place.",
  "tight-decimal":
    "A non-integer answer is marked with a tolerance below half a unit in its last printed digit.",
  "weak-idea":
    "A free-text accepted idea is empty after normalising, a bare stop word, or already in the prompt.",
  "card-back-missing-term": "A typed card's back contains none of its accepted terms.",
  "longest-option": "The correct option is the longest by more than 25%.",
  "letter-hint": "A hint gives away the first letter (begins with, starts with, first letter).",
  "duplicate-hint": "Two hints in one ladder say the same thing.",
  "reused-hint": "A hint sentence is used more than 20 times across the library.",
  "bare-last-hint": "The last hint of a numeric question is only the expression to calculate.",
  "single-final-blank": "A faded example has one blank, on its last step.",
  "one-type-check": "A lesson's three end-check questions are all one type.",
  "duplicate-prompt": "Two questions in one course have the same prompt.",
  "unreferenced-question": "No lesson refers to the question.",
};
const SHORT = {
  "misconception-in-band": "mis",
  "places-tolerance": "dp",
  "tight-decimal": "tight",
  "weak-idea": "idea",
  "card-back-missing-term": "card",
  "longest-option": "long",
  "letter-hint": "letter",
  "duplicate-hint": "duphint",
  "reused-hint": "reuse",
  "bare-last-hint": "bare",
  "single-final-blank": "blank",
  "one-type-check": "1type",
  "duplicate-prompt": "dupq",
  "unreferenced-question": "unref",
};

const HELP = `Usage: node scripts/content-lint-report.mjs [--out report.json] [--content dir]

Reads every <content>/<course>/bundle.json (default: content/) without changing it, prints a
table of rule counts per course, and with --out writes the offenders as JSON:
[{ "questionId", "course", "rule", "detail" }, ...]. Exit code is 0 whatever it finds.

Rules (column name, then what it reports):
${Object.entries(RULES)
  .map(([rule, text]) => `  ${SHORT[rule].padEnd(8)} ${rule}: ${text}`)
  .join("\n")}
`;

const args = process.argv.slice(2);
if (args.includes("--help") || args.includes("-h")) {
  process.stdout.write(HELP);
  process.exit(0);
}
function option(name) {
  const index = args.indexOf(name);
  if (index === -1) return undefined;
  const value = args[index + 1];
  if (!value || value.startsWith("--")) {
    process.stderr.write(`${name} needs a value.\n\n${HELP}`);
    process.exit(2);
  }
  return value;
}
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const contentRoot = path.resolve(option("--content") ?? path.join(root, "content"));
const out = option("--out");

/** Close to the text matcher's own normalising: lower case, words and numbers only. */
function normalise(text) {
  return String(text ?? "")
    .toLocaleLowerCase()
    .replace(/[’‘]/gu, "'")
    .replace(/(?<=\p{N})\.(?=\p{N})/gu, "·")
    .replace(/[^\p{L}\p{N}+*/=<>!·♭♯-]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}
function containsPhrase(text, phrase) {
  if (!phrase) return false;
  return ` ${text} `.includes(` ${phrase} `);
}
const STOP_WORDS = new Set(
  "yes no a an the it this that is are first second third last start end time rate left right up down top bottom more less same both none all one two".split(
    " ",
  ),
);
const NUMBER_WORDS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6 };

function allowedBand(authority) {
  return Math.max(
    authority.absoluteTolerance ?? 1e-9,
    Math.abs(authority.value) * (authority.relativeTolerance ?? 0.01),
  );
}
function placesAsked(prompt) {
  const count = (word) => NUMBER_WORDS[word.toLowerCase()] ?? Number(word);
  const dp = /\b(\d|one|two|three|four|five|six)\s+(?:decimal places?|d\.\s?p\.?)/iu.exec(prompt);
  if (dp) return { kind: "decimal places", n: count(dp[1]) };
  const sf =
    /\b(\d|one|two|three|four|five|six)\s+(?:significant figures?|sig\.? figs?|s\.\s?f\.?)/iu.exec(
      prompt,
    );
  if (sf) return { kind: "significant figures", n: count(sf[1]) };
  return null;
}
function questionType(question) {
  if (question.choices?.length) return "choice";
  return question.answerAuthority?.kind === "numeric" ? "numeric" : "text";
}
function sentences(text) {
  return String(text)
    .split(/(?<=[.!?])\s+/u)
    .map((sentence) => normalise(sentence))
    .filter((sentence) => sentence.split(" ").length >= 3);
}
function lessonQuestionRefs(lesson) {
  return [
    ...(lesson.questionIds ?? []),
    lesson.intro?.hook?.questionId,
    lesson.intro?.warmUpQuestionId,
    ...(lesson.steps ?? []).flatMap((step) => [
      step.checkQuestionId,
      ...(step.workedSteps ?? []).flatMap((line) => [
        line.blank?.questionId,
        line.selfExplain?.questionId,
      ]),
    ]),
  ].filter(Boolean);
}

const offenders = [];
const report = (course, questionId, rule, detail) =>
  offenders.push({ questionId, course, rule, detail });
const hintUses = new Map();

const courses = readdirSync(contentRoot)
  .filter((name) => existsSync(path.join(contentRoot, name, "bundle.json")))
  .sort();
for (const course of courses) {
  const bundle = JSON.parse(readFileSync(path.join(contentRoot, course, "bundle.json"), "utf8"));
  const checkQuestions = (bundle.courseChecks ?? []).flatMap((check) =>
    check.items.map((item) => item.question),
  );
  const questions = [...bundle.questions, ...checkQuestions];
  const byId = new Map(questions.map((question) => [question.id, question]));

  for (const question of questions) {
    const authority = question.answerAuthority;
    const prompt = question.prompt ?? "";
    if (authority.kind === "numeric") {
      const band = allowedBand(authority);
      for (const misconception of question.misconceptions ?? [])
        for (const value of misconception.match.numeric ?? [])
          if (Math.abs(value - authority.value) <= band)
            report(
              course,
              question.id,
              "misconception-in-band",
              `${value} is within ${authority.value} ± ${band}`,
            );
      const asked = placesAsked(prompt);
      if (asked) {
        const unit =
          asked.kind === "decimal places"
            ? 10 ** -asked.n
            : authority.value === 0
              ? null
              : 10 ** (Math.floor(Math.log10(Math.abs(authority.value))) - asked.n + 1);
        if (unit !== null && (band < 0.3 * unit || band > 1.0 * unit * (1 + 1e-9)))
          report(
            course,
            question.id,
            "places-tolerance",
            `asks for ${asked.n} ${asked.kind}; tolerance ${band}, half a unit is ${unit / 2}`,
          );
      }
      if (!Number.isInteger(authority.value)) {
        const printed = String(authority.value);
        const decimals = printed.includes("e") ? null : (printed.split(".")[1]?.length ?? 0);
        if (decimals !== null && band < 0.5 * 10 ** -decimals * 0.999)
          report(
            course,
            question.id,
            "tight-decimal",
            `${printed} marked within ${band}; half its last digit is ${0.5 * 10 ** -decimals}`,
          );
      }
      const lastHint = question.hints?.at(-1);
      if (
        lastHint &&
        /^(?:(?:calculate|compute|work out|evaluate|find|do)\s+)?[\d\s.,+\-−×÷*/^()=²³√%]+[.?]?$/iu.test(
          lastHint.trim(),
        ) &&
        /\d\s*[+\-−×÷*/^]\s*\d/u.test(lastHint)
      )
        report(course, question.id, "bare-last-hint", lastHint);
    } else if (!question.choices?.length) {
      const promptText = normalise(prompt);
      for (const idea of authority.acceptedIdeas ?? []) {
        const plain = normalise(idea);
        if (!plain)
          report(course, question.id, "weak-idea", `'${idea}' is empty after normalising`);
        else if (STOP_WORDS.has(plain))
          report(course, question.id, "weak-idea", `'${idea}' is a bare stop word`);
        else if (containsPhrase(promptText, plain))
          report(course, question.id, "weak-idea", `'${idea}' appears in the prompt`);
      }
    }
    if (question.choices?.length && authority.kind === "text") {
      const ideas = (authority.acceptedIdeas ?? []).map(normalise);
      const correct =
        question.choices.find((choice) => ideas.includes(normalise(choice.label))) ??
        question.choices.find((choice) =>
          ideas.some((idea) => containsPhrase(normalise(choice.label), idea)),
        );
      if (correct) {
        const others = question.choices.filter((choice) => choice !== correct);
        const longestOther = Math.max(...others.map((choice) => choice.label.length));
        if (others.length && correct.label.length > 1.25 * longestOther)
          report(
            course,
            question.id,
            "longest-option",
            `${correct.label.length} characters against ${longestOther} for the next longest`,
          );
      }
    }
    const hints = question.hints ?? [];
    for (const hint of hints) {
      if (/\b(?:begins with|starts with|first letter)\b/iu.test(hint))
        report(course, question.id, "letter-hint", hint);
      for (const sentence of sentences(hint)) {
        const uses = hintUses.get(sentence) ?? [];
        uses.push(`${course}/${question.id}`);
        hintUses.set(sentence, uses);
      }
    }
    const seen = new Set();
    for (const hint of hints) {
      const plain = normalise(hint);
      if (seen.has(plain)) report(course, question.id, "duplicate-hint", hint);
      seen.add(plain);
    }
  }

  for (const card of bundle.flashcards ?? []) {
    const authority = card.answerAuthority;
    if (authority?.kind !== "text") continue;
    const back = normalise(card.back);
    if (!(authority.acceptedIdeas ?? []).some((idea) => containsPhrase(back, normalise(idea))))
      report(
        course,
        card.id,
        "card-back-missing-term",
        `back has none of: ${authority.acceptedIdeas.join(" | ")}`,
      );
  }

  const referenced = new Set();
  for (const lesson of bundle.lessons ?? []) {
    for (const id of lessonQuestionRefs(lesson)) referenced.add(id);
    const end = (lesson.questionIds ?? []).map((id) => byId.get(id)).filter(Boolean);
    if (end.length === 3 && new Set(end.map(questionType)).size === 1)
      report(course, lesson.id, "one-type-check", `all three are ${questionType(end[0])}`);
    for (const step of lesson.steps ?? []) {
      const lines = step.workedSteps ?? [];
      const blanks = lines.map((line, index) => (line.blank ? index : -1)).filter((i) => i >= 0);
      if (lines.length > 1 && blanks.length === 1 && blanks[0] === lines.length - 1)
        report(
          course,
          lines[blanks[0]].blank.questionId ?? `${lesson.id}/${step.id}`,
          "single-final-blank",
          `lesson ${lesson.id}, step ${step.id}: the only blank is line ${lines.length} of ${lines.length}`,
        );
    }
  }
  for (const question of bundle.questions)
    if (!referenced.has(question.id))
      report(course, question.id, "unreferenced-question", "no lesson refers to it");

  const prompts = new Map();
  for (const question of questions) {
    const plain = normalise(question.prompt);
    if (!plain) continue;
    const first = prompts.get(plain);
    if (first) report(course, question.id, "duplicate-prompt", `same prompt as ${first}`);
    else prompts.set(plain, question.id);
  }
}

for (const [sentence, uses] of hintUses)
  if (uses.length > 20) {
    const [course, questionId] = uses[0].split("/");
    report(
      course,
      questionId,
      "reused-hint",
      `used ${uses.length} times: "${sentence}" (also ${uses.slice(1, 4).join(", ")}…)`,
    );
  }

// Table: one row per course, one column per rule, and a total row.
const ruleNames = Object.keys(RULES);
const counts = new Map(
  courses.map((course) => [course, Object.fromEntries(ruleNames.map((r) => [r, 0]))]),
);
for (const offender of offenders) counts.get(offender.course)[offender.rule]++;
const width = Math.max(6, ...courses.map((course) => course.length));
const header = ["course".padEnd(width), ...ruleNames.map((rule) => SHORT[rule].padStart(7))].join(
  " ",
);
const lines = [header, "-".repeat(header.length)];
for (const course of courses)
  lines.push(
    [
      course.padEnd(width),
      ...ruleNames.map((rule) => String(counts.get(course)[rule]).padStart(7)),
    ].join(" "),
  );
lines.push("-".repeat(header.length));
lines.push(
  [
    "total".padEnd(width),
    ...ruleNames.map((rule) =>
      String(offenders.filter((offender) => offender.rule === rule).length).padStart(7),
    ),
  ].join(" "),
);
process.stdout.write(
  `${lines.join("\n")}\n\n${offenders.length} findings in ${courses.length} courses.\n`,
);
if (out) {
  writeFileSync(path.resolve(out), `${JSON.stringify(offenders, null, 2)}\n`);
  process.stdout.write(`Wrote ${path.resolve(out)}.\n`);
}
