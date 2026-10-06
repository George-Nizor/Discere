import type {
  Achievement,
  Chest,
  ChestRarity,
  DailyQuests,
  InventoryItemId,
  League,
  Quest,
} from "@discere/contracts";
import { localStudyDay, offsetStudyDay, type StudyEvent } from "./study.js";

/**
 * Quests, chests, leagues, achievements and combos are all read back from the evidence ledger.
 * Nothing here awards evidence, and nothing invents an opponent: the league is a ladder climbed
 * against fixed weekly targets, and a combo is a run of genuinely independent first answers.
 */

const isCompletion = (event: StudyEvent) =>
  event.kind === "stage" && event.key.endsWith(":completion");

/** Answer events whose question was later corrected were not right first time. */
function firstTimeRuns(events: readonly StudyEvent[]): number[] {
  const corrected = new Set(
    events.filter((event) => event.kind === "recovery").map((event) => event.referenceId),
  );
  const runs: number[] = [];
  let run = 0;
  for (const event of events) {
    if (event.kind !== "answer" || !event.qualifying) continue;
    if (event.correct && event.independent && !corrected.has(event.referenceId)) run += 1;
    else {
      if (run) runs.push(run);
      run = 0;
    }
  }
  if (run) runs.push(run);
  return runs;
}

export function bestCombo(events: readonly StudyEvent[]): number {
  return Math.max(0, ...firstTimeRuns(events));
}

function hash(text: string): number {
  let value = 2166136261;
  for (const character of text) {
    value ^= character.codePointAt(0)!;
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

/* ------------------------------------------------------------------ chests */

export const CHEST_RARITIES = ["common", "rare", "epic", "legendary"] as const;
export const CHEST_REWARDS: Record<
  ChestRarity,
  { xp: number; items: Array<{ id: InventoryItemId; count: number }> }
> = {
  common: { xp: 20, items: [] },
  rare: { xp: 30, items: [{ id: "xp-boost", count: 1 }] },
  epic: {
    xp: 45,
    items: [
      { id: "xp-boost", count: 1 },
      { id: "quest-swap", count: 1 },
    ],
  },
  legendary: {
    xp: 70,
    items: [
      { id: "xp-boost", count: 2 },
      { id: "quest-swap", count: 1 },
      { id: "streak-freeze", count: 1 },
    ],
  },
};

export interface ChestDay {
  /** Different questions answered correctly today without hints, reveals or tutor help. */
  independentToday: number;
  /** The streak including today, once today counts. */
  streakDays: number;
  /** Longest right-first-time run today. */
  comboToday: number;
  dailyGoal: number;
}

/** Each condition raises the chest one rarity. All three are real work done today. */
export function chestUpgrades(day: ChestDay): Chest["upgrades"] {
  const independentTarget = Math.max(6, day.dailyGoal * 2);
  return [
    {
      id: "independent",
      label: `Solve ${independentTarget} questions on your own today`,
      current: Math.min(day.independentToday, independentTarget),
      target: independentTarget,
      met: day.independentToday >= independentTarget,
    },
    {
      id: "spree",
      label: "Get 10 right in a row, first time",
      current: Math.min(day.comboToday, 10),
      target: 10,
      met: day.comboToday >= 10,
    },
    {
      id: "streak",
      label: "Keep a 7-day streak going",
      current: Math.min(day.streakDays, 7),
      target: 7,
      met: day.streakDays >= 7,
    },
  ];
}

export function chestRarity(upgrades: Chest["upgrades"]): ChestRarity {
  return CHEST_RARITIES[upgrades.filter((upgrade) => upgrade.met).length]!;
}

/** Kept for callers that only need the base amount. */
export function chestXp(rarity: ChestRarity = "common"): number {
  return CHEST_REWARDS[rarity].xp;
}

/* ------------------------------------------------------------------ quests */

export interface QuestContext {
  today: string;
  timeZone: string;
  dailyGoal: number;
  /** Cards that were or are due today: the review quest is only offered when it can be done. */
  reviewableToday: number;
  chestClaimed: boolean;
  /** The rarity recorded when the chest was opened. */
  claimedRarity?: ChestRarity | null;
  /** The streak including today, for the chest's streak upgrade. */
  streakDays?: number;
  /** True when the learner already holds the most streak freezes allowed; a chest then omits one. */
  freezesFull?: boolean;
  /** The day's quests once chosen. Supplying them keeps the set fixed for the whole day. */
  fixedIds?: readonly string[];
}

interface DayCounts {
  correct: number;
  independent: number;
  combo: number;
  xp: number;
  reviews: number;
  lessons: number;
}

function dayCounts(events: readonly StudyEvent[], today: string, timeZone: string): DayCounts {
  const todays = events.filter((event) => localStudyDay(event.occurredAt, timeZone) === today);
  const answers = todays.filter((event) => event.kind === "answer" && event.qualifying);
  return {
    correct: new Set(answers.filter((e) => e.correct).map((e) => e.referenceId)).size,
    independent: new Set(
      answers.filter((e) => e.correct && e.independent).map((e) => e.referenceId),
    ).size,
    // Chest XP is a reward for quests, so it never counts towards a quest itself.
    xp: todays
      .filter((event) => !event.key.startsWith("chest:"))
      .reduce((total, event) => total + event.xp, 0),
    reviews: new Set(
      todays.filter((e) => e.kind === "review" && e.qualifying).map((e) => e.referenceId),
    ).size,
    lessons: todays.filter(isCompletion).length,
    combo: bestCombo(todays),
  };
}

function questPool(counts: DayCounts, context: QuestContext): Record<string, () => Quest> {
  const scale = context.dailyGoal <= 3 ? 0 : context.dailyGoal <= 5 ? 1 : 2;
  const seed = hash(context.today);
  const quest = (
    id: string,
    icon: Quest["icon"],
    title: string,
    description: string,
    current: number,
    target: number,
  ): Quest => ({
    id,
    icon,
    title,
    description,
    current: Math.min(current, target),
    target,
    complete: current >= target,
  });
  const correctTarget = [4, 6, 10][scale]!;
  const independentTarget = [3, 4, 7][scale]!;
  const comboTarget = seed % 2 ? 3 : 5;
  const xpTarget = [40, 60, 100][scale]!;
  const reviewTarget = Math.min(5, Math.max(3, context.dailyGoal - 2));
  return {
    correct: () =>
      quest(
        "correct",
        "target",
        "Sharp mind",
        `Answer ${correctTarget} different questions correctly.`,
        counts.correct,
        correctTarget,
      ),
    independent: () =>
      quest(
        "independent",
        "brain",
        "On your own",
        `Solve ${independentTarget} questions without hints, reveals or tutor help.`,
        counts.independent,
        independentTarget,
      ),
    combo: () =>
      quest(
        "combo",
        "flame",
        "In the zone",
        `Get ${comboTarget} right in a row, first time, without help.`,
        counts.combo,
        comboTarget,
      ),
    xp: () =>
      quest(
        "xp",
        "bolt",
        "XP hunter",
        `Earn ${xpTarget} XP from answers, recall and lessons.`,
        counts.xp,
        xpTarget,
      ),
    review: () =>
      quest(
        "review",
        "cards",
        "Memory keeper",
        `Recall ${reviewTarget} cards that are due.`,
        counts.reviews,
        reviewTarget,
      ),
    lesson: () =>
      quest("lesson", "trophy", "Finisher", "Finish a lesson and its recall.", counts.lessons, 1),
  };
}

const reviewQuestPossible = (context: QuestContext) =>
  context.reviewableToday >= Math.min(5, Math.max(3, context.dailyGoal - 2));

export function dailyQuests(events: readonly StudyEvent[], context: QuestContext): DailyQuests {
  const { today, timeZone } = context;
  const counts = dayCounts(events, today, timeZone);
  const seed = hash(today);
  const pool = questPool(counts, context);
  const chosen =
    context.fixedIds && context.fixedIds.length === 3 && context.fixedIds.every((id) => id in pool)
      ? context.fixedIds
      : [
          (seed >> 1) % 2 ? "correct" : "independent",
          (seed >> 2) % 2 ? "combo" : "xp",
          reviewQuestPossible(context) && (seed >> 3) % 2 ? "review" : "lesson",
        ];
  const quests = chosen.map((id) => pool[id]!());
  const ready = quests.every((item) => item.complete);
  const upgrades = chestUpgrades({
    independentToday: counts.independent,
    streakDays: context.streakDays ?? 0,
    comboToday: counts.combo,
    dailyGoal: context.dailyGoal,
  });
  const rarity =
    context.chestClaimed && context.claimedRarity ? context.claimedRarity : chestRarity(upgrades);
  return {
    date: today,
    quests,
    chest: {
      ready,
      claimed: context.chestClaimed,
      rarity,
      xp: CHEST_REWARDS[rarity].xp,
      items: CHEST_REWARDS[rarity].items.filter(
        (item) => !(item.id === "streak-freeze" && context.freezesFull),
      ),
      upgrades,
    },
  };
}

/**
 * The quest a swap puts in place of `questId`: the first one in a date-seeded order that is not
 * already on the board, not already complete, and can actually be done today.
 */
export function swapQuest(
  events: readonly StudyEvent[],
  context: QuestContext & { fixedIds: readonly string[] },
  questId: string,
): string | null {
  const current = dailyQuests(events, context);
  const target = current.quests.find((quest) => quest.id === questId);
  if (!target || target.complete) return null;
  const pool = questPool(dayCounts(events, context.today, context.timeZone), context);
  const order = Object.keys(pool).sort(
    (a, b) => hash(`${context.today}:${a}`) - hash(`${context.today}:${b}`),
  );
  return (
    order.find(
      (id) =>
        !context.fixedIds.includes(id) &&
        !pool[id]!().complete &&
        (id !== "review" || reviewQuestPossible(context)),
    ) ?? null
  );
}

/* ------------------------------------------------------------------ league */

/**
 * A ladder held for a whole week. When the week closes, weekly XP at or above `promote` moves the
 * learner up one league; XP below `hold` moves them down one. Bronze never drops and Diamond never
 * promotes. Targets were set so that the default goal (about 100 XP on a study day) climbs one
 * league a week through the lower half, while the upper half asks for most days of the week.
 */
export const LEAGUE_TIERS = [
  { id: "bronze", name: "Bronze", promote: 100, hold: 0 },
  { id: "silver", name: "Silver", promote: 175, hold: 40 },
  { id: "gold", name: "Gold", promote: 250, hold: 80 },
  { id: "sapphire", name: "Sapphire", promote: 350, hold: 120 },
  { id: "ruby", name: "Ruby", promote: 450, hold: 160 },
  { id: "emerald", name: "Emerald", promote: 575, hold: 200 },
  { id: "amethyst", name: "Amethyst", promote: 700, hold: 250 },
  { id: "pearl", name: "Pearl", promote: 850, hold: 300 },
  { id: "obsidian", name: "Obsidian", promote: 1000, hold: 375 },
  { id: "diamond", name: "Diamond", promote: null, hold: 450 },
] as const;

const tierRef = (index: number) => ({
  id: LEAGUE_TIERS[index]!.id,
  name: LEAGUE_TIERS[index]!.name,
  index,
});

/** The move a closed week makes from a given league. */
export function leagueOutcome(index: number, xp: number): -1 | 0 | 1 {
  const tier = LEAGUE_TIERS[index]!;
  if (tier.promote !== null && xp >= tier.promote) return 1;
  if (index > 0 && xp < tier.hold) return -1;
  return 0;
}

/** Monday of the study week containing a date label. */
export function weekStart(day: string): string {
  const weekday = (new Date(`${day}T12:00:00Z`).getUTCDay() + 6) % 7;
  return offsetStudyDay(day, -weekday);
}

export interface LeagueWeek {
  weekStart: string;
  xp: number;
  tier: number;
  outcome: "promoted" | "stayed" | "dropped" | "current";
}

/** Replays every week from the first week with XP, so the ladder is always derived, never stored. */
export function leagueLadder(
  events: readonly StudyEvent[],
  today: string,
  timeZone: string,
): LeagueWeek[] {
  const monday = weekStart(today);
  const byWeek = new Map<string, number>();
  for (const event of events) {
    if (!event.xp) continue;
    const day = localStudyDay(event.occurredAt, timeZone);
    if (day > today) continue;
    const week = weekStart(day);
    byWeek.set(week, (byWeek.get(week) ?? 0) + event.xp);
  }
  const first = [...byWeek.keys()].sort()[0] ?? monday;
  const weeks: LeagueWeek[] = [];
  let tier = 0;
  for (let week = first; week <= monday; week = offsetStudyDay(week, 7)) {
    const xp = byWeek.get(week) ?? 0;
    if (week === monday) {
      weeks.push({ weekStart: week, xp, tier, outcome: "current" });
      break;
    }
    const move = leagueOutcome(tier, xp);
    weeks.push({
      weekStart: week,
      xp,
      tier,
      outcome: move > 0 ? "promoted" : move < 0 ? "dropped" : "stayed",
    });
    tier += move;
  }
  return weeks;
}

export function league(events: readonly StudyEvent[], today: string, timeZone: string): League {
  const monday = weekStart(today);
  const elapsed = Math.round(
    (Date.parse(`${today}T12:00:00Z`) - Date.parse(`${monday}T12:00:00Z`)) / 86_400_000,
  );
  const ladder = leagueLadder(events, today, timeZone);
  const current = ladder.at(-1)!;
  const lastWeekStart = offsetStudyDay(monday, -7);
  const sameDayLastWeek = offsetStudyDay(lastWeekStart, elapsed);
  let lastWeekSoFar = 0;
  for (const event of events) {
    if (!event.xp) continue;
    const day = localStudyDay(event.occurredAt, timeZone);
    if (weekStart(day) === lastWeekStart && day <= sameDayLastWeek) lastWeekSoFar += event.xp;
  }
  const byWeek = new Map(ladder.map((week) => [week.weekStart, week]));
  const tier = LEAGUE_TIERS[current.tier]!;
  const move = leagueOutcome(current.tier, current.xp);
  const highest = Math.max(
    0,
    ...ladder.map((week) => week.tier + (week.outcome === "promoted" ? 1 : 0)),
  );
  return {
    weekStart: monday,
    weekEnd: offsetStudyDay(monday, 6),
    daysLeft: 6 - elapsed,
    weekXp: current.xp,
    tier: tierRef(current.tier),
    next: current.tier + 1 < LEAGUE_TIERS.length ? tierRef(current.tier + 1) : null,
    previous: current.tier > 0 ? tierRef(current.tier - 1) : null,
    promoteAt: tier.promote,
    holdAt: tier.hold,
    projected: move > 0 ? "promote" : move < 0 ? "drop" : "stay",
    highest: tierRef(highest),
    lastWeekXp: byWeek.get(lastWeekStart)?.xp ?? 0,
    lastWeekSoFar,
    bestWeekXp: Math.max(0, ...ladder.filter((w) => w.weekStart < monday).map((w) => w.xp)),
    history: Array.from({ length: 8 }, (_, index) => {
      const week = offsetStudyDay(monday, (index - 7) * 7);
      const entry = byWeek.get(week);
      const at = entry?.tier ?? 0;
      return {
        weekStart: week,
        xp: entry?.xp ?? 0,
        tier: LEAGUE_TIERS[at]!.id,
        tierName: LEAGUE_TIERS[at]!.name,
        outcome: entry?.outcome ?? "before",
      };
    }),
  };
}

/* ------------------------------------------------------------ achievements */

export const RANK_NAMES = ["I", "II", "III", "IV", "V"] as const;

export interface AchievementInput {
  events: readonly StudyEvent[];
  /** Real study dates, sorted; protected days are not study. */
  studyDates: readonly string[];
  longestStreak: number;
  /** The highest league ever reached, by index. */
  highestLeague: number;
  timeZone: string;
}

/**
 * One achievement system. Every rank is computed from the ledger, so nothing earned can be lost
 * and the date a rank was reached is the date of the event that crossed its threshold. The seven
 * single milestones from 30 September are now first ranks here (see docs/gamification).
 */
export function achievements({
  events,
  studyDates,
  longestStreak,
  highestLeague,
  timeZone,
}: AchievementInput): Achievement[] {
  const unique = (list: StudyEvent[]) =>
    [...new Map(list.map((event) => [event.referenceId, event])).values()].sort((a, b) =>
      a.occurredAt.localeCompare(b.occurredAt),
    );
  const lessons = events.filter(isCompletion);
  const independent = unique(
    events.filter((e) => e.kind === "answer" && e.qualifying && e.correct && e.independent),
  );
  const reviews = events.filter((e) => e.kind === "review" && e.qualifying);
  const transfers = unique(events.filter((e) => e.kind === "transfer" && e.correct));
  const corrections = unique(events.filter((e) => e.kind === "recovery" && e.correct));
  const chests = events.filter((event) => event.key.startsWith("chest:"));
  const courses = [
    ...new Map(
      lessons.map((event) => [event.referenceId.split(":")[0] ?? event.referenceId, event]),
    ).values(),
  ];
  const firstEventOn = (day: string) =>
    events.find((event) => event.qualifying && localStudyDay(event.occurredAt, timeZone) === day)
      ?.occurredAt ?? null;
  const achievement = (
    id: string,
    title: string,
    description: string,
    thresholds: number[],
    current: number,
    dateOf?: (index: number) => string | null,
  ): Achievement => {
    const rank = thresholds.filter((threshold) => current >= threshold).length;
    return {
      id,
      title,
      description,
      rank,
      thresholds,
      current,
      nextTarget: thresholds[rank] ?? null,
      earned: thresholds.slice(0, rank).map((threshold, index) => ({
        rank: index + 1,
        at: dateOf ? dateOf(threshold - 1) : null,
      })),
    };
  };
  const dated = (list: readonly StudyEvent[]) => (index: number) => list[index]?.occurredAt ?? null;
  return [
    achievement(
      "scholar",
      "Scholar",
      "Finish lessons, recall cards included.",
      [1, 5, 15, 40, 100],
      lessons.length,
      dated(lessons),
    ),
    achievement(
      "sharpshooter",
      "Sharpshooter",
      "Solve different questions without hints, reveals or tutor help.",
      [5, 25, 100, 250, 600],
      independent.length,
      dated(independent),
    ),
    achievement(
      "memory-palace",
      "Memory Palace",
      "Respond to recall cards when they fall due.",
      [10, 50, 150, 400, 1000],
      reviews.length,
      dated(reviews),
    ),
    achievement(
      "second-wind",
      "Second Wind",
      "Correct a wrong answer on your own, without a hint.",
      [1, 10, 30, 75, 150],
      corrections.length,
      dated(corrections),
    ),
    achievement(
      "bridge-builder",
      "Bridge Builder",
      "Solve a changed problem after studying a worked answer.",
      [1, 5, 15, 40, 100],
      transfers.length,
      dated(transfers),
    ),
    achievement(
      "regular",
      "Regular",
      "Practise on different days. Protected days do not count.",
      [7, 30, 100, 200, 365],
      studyDates.length,
      (index) => (studyDates[index] ? firstEventOn(studyDates[index]!) : null),
    ),
    achievement(
      "unbroken",
      "Unbroken",
      "Your longest streak, in days.",
      [3, 7, 14, 30, 100],
      longestStreak,
    ),
    achievement(
      "in-the-zone",
      "In the Zone",
      "Your longest run of answers right first time.",
      [3, 5, 10, 15, 25],
      bestCombo(events),
    ),
    achievement(
      "polymath",
      "Polymath",
      "Finish lessons in different courses.",
      [2, 4, 6, 9, 12],
      courses.length,
      dated(courses),
    ),
    achievement(
      "treasure",
      "Treasure Hunter",
      "Open the daily chest by finishing all three quests.",
      [1, 5, 15, 40, 100],
      chests.length,
      dated(chests),
    ),
    achievement(
      "climber",
      "Climber",
      "Reach higher leagues: Silver, Sapphire, Emerald, Pearl and Diamond.",
      [1, 3, 5, 7, 9],
      highestLeague,
    ),
  ];
}

/* ---------------------------------------------------------------- titles */

/** A title for each band of levels, shown beside the level number. */
export const LEVEL_TITLES = [
  { from: 1, title: "Newcomer" },
  { from: 3, title: "Apprentice" },
  { from: 6, title: "Student" },
  { from: 10, title: "Adept" },
  { from: 15, title: "Expert" },
  { from: 20, title: "Sage" },
  { from: 30, title: "Luminary" },
] as const;

export function levelTitle(level: number): string {
  let title: string = LEVEL_TITLES[0].title;
  for (const band of LEVEL_TITLES) if (level >= band.from) title = band.title;
  return title;
}
