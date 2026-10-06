import { limitLessons } from "./limits.js";
import { derivativeLessons } from "./derivatives.js";
import { buildingLessons } from "./building.js";
import { accumulationLessons } from "./accumulation.js";
export const calculusLessons = [
  ...limitLessons,
  ...derivativeLessons,
  ...buildingLessons,
  ...accumulationLessons,
];

import { calculusHints } from "./hints.js";
for (const lesson of calculusLessons) {
  let numericIndex = 0;
  for (const question of lesson.questions) {
    if (question.answerAuthority.kind === "numeric") {
      const extra = calculusHints[lesson.id]?.[numericIndex++];
      if (!extra) throw Error("Missing hint ladder: " + lesson.id);
      question.hints.push(...extra);
    }
  }
}
