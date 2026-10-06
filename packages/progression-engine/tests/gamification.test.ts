import { describe, expect, it } from "vitest";
import {
  achievements,
  bestCombo,
  CHEST_REWARDS,
  chestRarity,
  chestUpgrades,
  dailyQuests,
  league,
  leagueLadder,
  leagueOutcome,
  levelTitle,
  swapQuest,
  weekStart,
} from "../src/gamification.js";
import type { StudyEvent } from "../src/study.js";

let sequence = 0;
const event = (overrides: Partial<StudyEvent> = {}): StudyEvent => {
  sequence += 1;
  const at =
    overrides.occurredAt ?? `2026-10-06T10:${String(sequence % 60).padStart(2, "0")}:00.000Z`;
  return {
    key: `answer:${sequence}`,
    kind: "answer",
    referenceId: `q${sequence}`,
    occurredAt: at,
    updatedAt: at,
    xp: 0,
    correct: true,
    independent: true,
    qualifying: true,
    ...overrides,
  };
};
const context = {
  today: "2026-10-06",
  timeZone: "UTC",
  dailyGoal: 5,
  reviewableToday: 0,
  chestClaimed: false,
};

describe("combos", () => {
  it("counts runs of independent first answers and breaks on a miss", () => {
    const events = [event(), event(), event({ correct: false }), event(), event(), event()];
    expect(bestCombo(events)).toBe(3);
  });
  it("does not count a question that was corrected after a miss", () => {
    const first = event({ referenceId: "fixed" });
    const recovery = event({ kind: "recovery", referenceId: "fixed", qualifying: false });
    expect(bestCombo([event(), first, event(), recovery])).toBe(1);
  });
  it("ignores hinted or tutor-assisted answers", () => {
    expect(bestCombo([event(), event({ independent: false }), event()])).toBe(1);
  });
});

describe("daily quests", () => {
  it("offers three stable quests for a day", () => {
    const a = dailyQuests([], context);
    const b = dailyQuests([event({ occurredAt: "2026-10-05T10:00:00.000Z" })], context);
    expect(a.quests.map((q) => q.id)).toEqual(b.quests.map((q) => q.id));
    expect(a.quests).toHaveLength(3);
    expect(a.chest.ready).toBe(false);
  });
  it("never offers a review quest when too few cards can be due", () => {
    for (let day = 1; day <= 28; day += 1) {
      const today = `2026-11-${String(day).padStart(2, "0")}`;
      const quests = dailyQuests([], { ...context, today, reviewableToday: 0 });
      expect(quests.quests.map((q) => q.id)).not.toContain("review");
    }
  });
  it("readies the chest once all three are complete", () => {
    const today = "2026-10-06";
    const events = [
      ...Array.from({ length: 12 }, () => event({ xp: 10 })),
      event({ kind: "stage", key: "stage:c:l:completion", referenceId: "c:l", correct: false }),
      ...Array.from({ length: 6 }, (_, i) =>
        event({ kind: "review", key: `review:${i}`, referenceId: `card${i}` }),
      ),
    ];
    const quests = dailyQuests(events, { ...context, today, reviewableToday: 10 });
    expect(quests.quests.every((q) => q.complete)).toBe(true);
    expect(quests.chest.ready).toBe(true);
    expect(quests.chest.rarity).toBe("epic"); // 12 on your own and a run of 12
    expect(quests.chest.xp).toBe(CHEST_REWARDS.epic.xp);
  });
  it("only counts today's work", () => {
    const yesterday = Array.from({ length: 12 }, () =>
      event({ occurredAt: "2026-10-05T10:00:00.000Z", xp: 10 }),
    );
    expect(dailyQuests(yesterday, context).quests.every((q) => q.current === 0)).toBe(true);
  });
});

describe("chests", () => {
  const day = { independentToday: 0, streakDays: 0, comboToday: 0, dailyGoal: 5 };
  it("rises one rarity for each condition met today", () => {
    expect(chestRarity(chestUpgrades(day))).toBe("common");
    expect(chestRarity(chestUpgrades({ ...day, streakDays: 7 }))).toBe("rare");
    expect(chestRarity(chestUpgrades({ ...day, streakDays: 9, comboToday: 10 }))).toBe("epic");
    expect(
      chestRarity(
        chestUpgrades({ independentToday: 10, streakDays: 7, comboToday: 12, dailyGoal: 5 }),
      ),
    ).toBe("legendary");
  });
  it("asks for twice the daily goal on your own, never fewer than six", () => {
    expect(chestUpgrades({ ...day, dailyGoal: 3 })[0]!.target).toBe(6);
    expect(chestUpgrades({ ...day, dailyGoal: 10 })[0]!.target).toBe(20);
  });
  it("keeps the rarity it opened at", () => {
    const quests = dailyQuests([], { ...context, chestClaimed: true, claimedRarity: "epic" });
    expect(quests.chest).toMatchObject({
      claimed: true,
      rarity: "epic",
      xp: CHEST_REWARDS.epic.xp,
    });
  });
  it("only legendary chests carry a streak freeze", () => {
    expect(CHEST_REWARDS.legendary.items.map((item) => item.id)).toContain("streak-freeze");
    expect(CHEST_REWARDS.epic.items.map((item) => item.id)).not.toContain("streak-freeze");
  });
});

describe("quest swaps", () => {
  it("replaces an unfinished quest with one not on the board", () => {
    const fixedIds = ["correct", "combo", "lesson"];
    const swapped = swapQuest([], { ...context, fixedIds }, "combo");
    expect(swapped).not.toBeNull();
    expect(fixedIds).not.toContain(swapped);
    expect(swapped).not.toBe("review");
  });
  it("refuses a finished quest or one that is not on the board", () => {
    const fixedIds = ["correct", "combo", "lesson"];
    const events = Array.from({ length: 6 }, () => event());
    expect(swapQuest(events, { ...context, fixedIds }, "combo")).toBeNull();
    expect(swapQuest([], { ...context, fixedIds }, "xp")).toBeNull();
  });
  it("keeps chest XP out of the XP quest", () => {
    const chest = event({ kind: "reward", key: "chest:2026-10-06", xp: 70 });
    const quests = dailyQuests([chest], { ...context, fixedIds: ["xp", "combo", "lesson"] });
    expect(quests.quests[0]!.current).toBe(0);
  });
});

describe("league", () => {
  it("starts weeks on Monday", () => {
    expect(weekStart("2026-10-06")).toBe("2026-10-05");
    expect(weekStart("2026-10-11")).toBe("2026-10-05");
    expect(weekStart("2026-10-12")).toBe("2026-10-12");
  });
  it("holds a league for the whole week and moves it when the week closes", () => {
    const events = [
      event({ occurredAt: "2026-09-21T09:00:00.000Z", xp: 120 }),
      event({ occurredAt: "2026-09-28T09:00:00.000Z", xp: 40 }),
      event({ occurredAt: "2026-10-01T09:00:00.000Z", xp: 100 }),
      event({ occurredAt: "2026-10-05T09:00:00.000Z", xp: 70 }),
    ];
    const ladder = leagueLadder(events, "2026-10-06", "UTC");
    expect(ladder.map((week) => [week.tier, week.outcome])).toEqual([
      [0, "promoted"],
      [1, "stayed"],
      [1, "current"],
    ]);
    const result = league(events, "2026-10-06", "UTC");
    expect(result.tier.id).toBe("silver");
    expect(result.weekXp).toBe(70);
    expect(result.promoteAt).toBe(175);
    expect(result.holdAt).toBe(40);
    expect(result.projected).toBe("stay");
    expect(result.lastWeekXp).toBe(140);
    expect(result.lastWeekSoFar).toBe(40);
    expect(result.daysLeft).toBe(5);
    expect(result.weekEnd).toBe("2026-10-11");
    expect(result.history).toHaveLength(8);
    expect(result.history.at(-1)).toMatchObject({ xp: 70, outcome: "current", tierName: "Silver" });
    expect(result.history[0]!.outcome).toBe("before");
    expect(result.highest.id).toBe("silver");
  });
  it("drops a league after a quiet week, but never below Bronze", () => {
    expect(leagueOutcome(0, 0)).toBe(0);
    expect(leagueOutcome(2, 79)).toBe(-1);
    expect(leagueOutcome(2, 80)).toBe(0);
    expect(leagueOutcome(2, 250)).toBe(1);
    expect(leagueOutcome(9, 5000)).toBe(0);
    const events = [
      event({ occurredAt: "2026-09-14T09:00:00.000Z", xp: 100 }),
      event({ occurredAt: "2026-09-21T09:00:00.000Z", xp: 175 }),
    ];
    // Gold from 28 September, then an empty week drops back to Silver.
    expect(league(events, "2026-10-06", "UTC")).toMatchObject({
      tier: { id: "silver" },
      highest: { id: "gold" },
    });
  });
  it("starts a new learner in Bronze with a clear first target", () => {
    expect(league([], "2026-10-06", "UTC")).toMatchObject({
      tier: { id: "bronze" },
      promoteAt: 100,
      holdAt: 0,
      projected: "stay",
      previous: null,
    });
  });
});

describe("level titles", () => {
  it("names bands of levels", () => {
    expect(levelTitle(1)).toBe("Newcomer");
    expect(levelTitle(5)).toBe("Apprentice");
    expect(levelTitle(12)).toBe("Adept");
    expect(levelTitle(40)).toBe("Luminary");
  });
});

describe("achievements", () => {
  it("ranks one system from real evidence and dates each rank", () => {
    const lessons = Array.from({ length: 5 }, (_, i) =>
      event({
        kind: "stage",
        key: `stage:course${i % 3}:l${i}:completion`,
        referenceId: `course${i % 3}:l${i}`,
        correct: false,
        independent: false,
      }),
    );
    const list = achievements({
      events: lessons,
      studyDates: ["2026-10-06"],
      longestStreak: 8,
      highestLeague: 3,
      timeZone: "UTC",
    });
    const byId = new Map(list.map((item) => [item.id, item]));
    expect(byId.get("scholar")).toMatchObject({ rank: 2, nextTarget: 15 });
    expect(byId.get("scholar")!.earned).toEqual([
      { rank: 1, at: lessons[0]!.occurredAt },
      { rank: 2, at: lessons[4]!.occurredAt },
    ]);
    expect(byId.get("polymath")).toMatchObject({ rank: 1, current: 3 });
    expect(byId.get("unbroken")).toMatchObject({ rank: 2, nextTarget: 14 });
    expect(byId.get("climber")).toMatchObject({ rank: 2 });
    expect(byId.get("treasure")).toMatchObject({ rank: 0, nextTarget: 1, earned: [] });
  });
  it("counts only independent, qualifying answers for Sharpshooter", () => {
    const events = [
      ...Array.from({ length: 5 }, () => event()),
      event({ independent: false }),
      event({ qualifying: false }),
    ];
    const sharp = achievements({
      events,
      studyDates: [],
      longestStreak: 0,
      highestLeague: 0,
      timeZone: "UTC",
    }).find((item) => item.id === "sharpshooter")!;
    expect(sharp).toMatchObject({ current: 5, rank: 1 });
  });
  it("replaces every 30 September milestone with a first rank", () => {
    const ids = achievements({
      events: [],
      studyDates: [],
      longestStreak: 0,
      highestLeague: 0,
      timeZone: "UTC",
    }).map((item) => [item.id, item.thresholds[0]]);
    expect(ids).toEqual(
      expect.arrayContaining([
        ["scholar", 1],
        ["sharpshooter", 5],
        ["memory-palace", 10],
        ["second-wind", 1],
        ["bridge-builder", 1],
        ["regular", 7],
      ]),
    );
  });
});

describe("chest contents", () => {
  it("leaves out a streak freeze the learner has no room for", () => {
    const events = [
      ...Array.from({ length: 12 }, () => event()),
      event({ kind: "stage", key: "stage:c:l:completion", referenceId: "c:l", correct: false }),
    ];
    const full = dailyQuests(events, {
      ...context,
      streakDays: 9,
      freezesFull: true,
      fixedIds: ["correct", "combo", "lesson"],
    });
    expect(full.chest.rarity).toBe("legendary");
    expect(full.chest.items.map((item) => item.id)).not.toContain("streak-freeze");
  });
});
