import { choiceLessons } from "./choice.js";
import { marketLessons } from "./markets.js";
import { strategyLessons } from "./strategy.js";
import { welfareLessons } from "./welfare.js";
export const economicsLessons = [
  ...choiceLessons,
  ...marketLessons,
  ...welfareLessons,
  ...strategyLessons,
];
