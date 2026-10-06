import { argumentLessons } from "./argument.js";
import { poetryLessons } from "./poetry.js";
import { proseLessons } from "./prose.js";
import { sentenceLessons } from "./sentence.js";
export const languageLessons = [
  ...sentenceLessons,
  ...argumentLessons,
  ...poetryLessons,
  ...proseLessons,
];
