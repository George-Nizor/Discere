import type { StudySummary } from "@discere/contracts";
import { offsetStudyDay } from "@discere/progression-engine";
export const studyFixture: StudySummary = {
  today: "2026-08-19",
  timeZone: "Australia/Sydney",
  preferences: {
    timeZone: "Australia/Sydney",
    dailyGoal: 5,
    motion: "system",
    celebrations: true,
    sound: false,
  },
  daily: { current: 1, target: 5, complete: false },
  streak: { days: 2, longest: 4, activeToday: true, charges: 1, nextChargeIn: 5 },
  week: Array.from({ length: 7 }, (_, index) => ({
    date: offsetStudyDay("2026-08-17", index),
    answers: index === 1 ? 2 : index === 2 ? 1 : 0,
    reviews: 0,
    lessons: 0,
    xp: 0,
    qualified: index === 1 || index === 2,
    protected: false,
  })),
  calendar: Array.from({ length: 70 }, (_, index) => ({
    date: offsetStudyDay("2026-08-19", index - 69),
    answers: index === 68 ? 2 : index === 69 ? 1 : 0,
    reviews: 0,
    lessons: 0,
    xp: 0,
    qualified: index >= 68,
    protected: false,
  })),
  totals: { answers: 3, independent: 2, reviews: 0, lessons: 0, transfers: 0 },
};
