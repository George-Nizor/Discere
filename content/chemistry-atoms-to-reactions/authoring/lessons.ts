import { amounts } from "./amounts.js";
import { atoms } from "./atoms.js";
import { bonds } from "./bonds.js";
import { reactionLessons } from "./reactions.js";
export const chemistryLessons = [...atoms, ...bonds, ...amounts, ...reactionLessons];

import { chemistryHints } from "./hints.js";

chemistryLessons.forEach((lesson, i) => {
  let numericIndex = 0;
  for (const question of lesson.questions) {
    if (question.answerAuthority.kind === "numeric") {
      const extra = chemistryHints[i]![numericIndex++]!;
      question.hints = [question.hints[0]!, ...extra];
    }
  }
});
