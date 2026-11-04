#!/usr/bin/env node
/**
 * Puts the options of every choice question in an order that does not give the answer away:
 *   node scripts/shuffle-choices.mjs <course-id> [<course-id> …]
 *
 * Writers tended to list the correct option first, so a learner could score by always picking
 * it. Each question's options are reordered by a permutation drawn from a hash of its id, so the
 * order is stable from run to run. Each option keeps its id, so misconceptions, recorded answers
 * and tests that name an option by id still point at the same option; the app never shows ids.
 * Options that are all numbers are put in ascending order instead, which is how a reader expects to
 * scan them. Course-check items are left as their
 * independent review approved them.
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

function seededOrder(seed, length) {
  const bytes = createHash("sha256").update(seed).digest();
  const order = [...Array(length).keys()];
  for (let i = length - 1; i > 0; i--) {
    const j = bytes[i] % (i + 1);
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

/** Reorders one question's choices in place. Returns true when the order changed. */
function reorder(question) {
  const choices = question.choices;
  if (!choices || choices.length < 2) return false;
  const numeric = choices.every((choice) => /^-?[\d.,]+\s*[%a-zA-Z°]*$/u.test(choice.label.trim()));
  const order = numeric
    ? [...choices.keys()].sort(
        (a, b) =>
          Number.parseFloat(choices[a].label.replace(/,/gu, "")) -
          Number.parseFloat(choices[b].label.replace(/,/gu, "")),
      )
    : seededOrder(question.id, choices.length);
  const next = order.map((from) => choices[from]);
  const changed = next.some((choice, i) => choice.id !== choices[i].id);
  question.choices = next;
  return changed;
}

const ids = process.argv.slice(2);
if (!ids.length) {
  console.error("Usage: node scripts/shuffle-choices.mjs <course-id> [<course-id> …]");
  process.exit(1);
}
for (const courseId of ids) {
  const file = path.resolve(import.meta.dirname, "..", "content", courseId, "bundle.json");
  const bundle = JSON.parse(readFileSync(file, "utf8"));
  const questions = bundle.questions;
  let changed = 0;
  let first = 0;
  let total = 0;
  for (const question of questions) {
    if (reorder(question)) changed++;
    const authority = question.answerAuthority;
    if (!question.choices || authority.kind !== "text") continue;
    total++;
    if (authority.acceptedIdeas.includes(question.choices[0].label)) first++;
  }
  writeFileSync(file, `${JSON.stringify(bundle, null, 2)}\n`);
  console.log(`${courseId}: ${changed} reordered; correct option first in ${first} of ${total}`);
}
