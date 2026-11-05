#!/usr/bin/env node
/**
 * Lists the questions whose answer is already printed before the learner is asked:
 *   node scripts/giveaway-check.mjs <course-id> [<course-id> …]
 *   node scripts/giveaway-check.mjs --all          one line per course, with counts
 *
 * For every numeric question asked on a screen (or in a worked or faded example), it looks for the
 * answer in what the learner has just read: the opener, the two screens before, the screen's own
 * lead and visible figure, and the earlier lines of the same example. Small whole numbers below 10
 * are skipped because they match by accident. A hit is a suspect, not a verdict: read the screen.
 * It also lists predict screens whose answer label (for a choice) appears in the screen before.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const textOf = (value) => JSON.stringify(value ?? "").replace(/\\n/g, " ");
const forms = (value) => {
  const out = new Set([String(value)]);
  if (Number.isInteger(value) && Math.abs(value) >= 1000) out.add(value.toLocaleString("en-GB"));
  return [...out];
};
const appears = (value, text) =>
  forms(value).some((form) =>
    new RegExp(`(^|[^0-9.,])${form.replace(/[.]/g, "\\.")}([^0-9]|$)`).test(text),
  );

function suspects(courseId) {
  const bundle = JSON.parse(
    readFileSync(path.join(root, "content", courseId, "bundle.json"), "utf8"),
  );
  const questions = new Map(bundle.questions.map((q) => [q.id, q]));
  const found = [];
  for (const lesson of bundle.lessons) {
    const steps = lesson.steps ?? [];
    steps.forEach((step, index) => {
      const asked = [
        step.checkQuestionId,
        ...(step.workedSteps ?? []).map((line) => line.blank?.questionId),
      ].filter(Boolean);
      for (const id of asked) {
        const q = questions.get(id);
        if (!q) continue;
        const earlierLines = step.workedSteps
          ? step.workedSteps.slice(
              0,
              step.workedSteps.findIndex((line) => line.blank?.questionId === id),
            )
          : [];
        const visible =
          step.answerVisibility === "hidden-until-response" ? "" : textOf(step.diagram);
        const before = [
          textOf(lesson.intro?.hook),
          ...steps.slice(Math.max(0, index - 2), index).map(textOf),
          textOf(step.lead),
          textOf(earlierLines),
          visible,
        ].join(" ");
        const authority = q.answerAuthority;
        if (authority.kind === "numeric") {
          const value = authority.value;
          if (Number.isInteger(value) && Math.abs(value) < 10) continue;
          if (appears(value, before))
            found.push(
              `${lesson.id} / ${step.id} (${step.kind}) / ${id}: answer ${value} ${authority.unit ?? ""}`.trim(),
            );
        } else if (step.kind === "predict" && q.choices?.length) {
          const label = authority.acceptedIdeas?.[0] ?? "";
          const previous = index > 0 ? textOf(steps[index - 1]).toLowerCase() : "";
          const words = label.toLowerCase().match(/[a-z]{5,}/g) ?? [];
          if (words.length >= 2 && words.every((word) => previous.includes(word)))
            found.push(
              `${lesson.id} / ${step.id} (predict) / ${id}: the screen before states "${label}"`,
            );
        }
      }
    });
  }
  return found;
}

const args = process.argv.slice(2);
if (!args.length) {
  console.error("Usage: node scripts/giveaway-check.mjs <course-id> [<course-id> …] | --all");
  process.exit(1);
}
const courses =
  args[0] === "--all"
    ? readdirSync(path.join(root, "content")).filter((c) =>
        existsSync(path.join(root, "content", c, "bundle.json")),
      )
    : args;
for (const courseId of courses) {
  const found = suspects(courseId);
  if (args[0] === "--all") console.log(`${String(found.length).padStart(3)}  ${courseId}`);
  else
    console.log(
      `${courseId}: ${found.length} suspect(s)\n${found.map((line) => `  ${line}`).join("\n")}`,
    );
}
