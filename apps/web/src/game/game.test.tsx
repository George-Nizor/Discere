import type { DailyQuests, League, StudySummary } from "@discere/contracts";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { registerAnswer, resetCombo, useCombo } from "../fx/combo.js";
import { lessonStars } from "../journey/stages/CompletionStageView.js";
import { renderWithProviders, stubFetch } from "../test/harness.js";
import { AchievementWall } from "./AchievementWall.js";
import { announcementsBetween } from "./GameWatcher.js";
import { lessonPhase } from "./announcements.js";
import { nextNudge } from "./HomeHero.js";
import { LeagueCard } from "./LeagueCard.js";
import { studyFixture } from "../test/study-fixture.js";
import { QuestBoard } from "./QuestBoard.js";

afterEach(() => {
  vi.unstubAllGlobals();
  resetCombo();
});

const quests = (ready: boolean, claimed = false): DailyQuests => ({
  date: "2026-10-06",
  quests: [
    {
      id: "correct",
      icon: "target",
      title: "Sharp mind",
      description: "Answer 6.",
      current: ready ? 6 : 2,
      target: 6,
      complete: ready,
    },
    {
      id: "combo",
      icon: "flame",
      title: "In the zone",
      description: "Run of 3.",
      current: 3,
      target: 3,
      complete: true,
    },
    {
      id: "lesson",
      icon: "trophy",
      title: "Finisher",
      description: "Finish one.",
      current: ready ? 1 : 0,
      target: 1,
      complete: ready,
    },
  ],
  chest: {
    ready,
    claimed,
    rarity: "rare",
    xp: 30,
    items: [{ id: "xp-boost", count: 1 }],
    upgrades: [
      { id: "streak", label: "Keep a 7-day streak going", current: 7, target: 7, met: true },
      {
        id: "spree",
        label: "Get 10 right in a row, first time",
        current: 3,
        target: 10,
        met: false,
      },
    ],
  },
});

describe("combo", () => {
  it("grows on first-time answers, holds on a corrected one, and resets on a miss", () => {
    expect(registerAnswer("/l", true, true)).toBe(1);
    expect(registerAnswer("/l", true, true)).toBe(2);
    expect(registerAnswer("/l", false, true)).toBe(2);
    expect(registerAnswer("/l", false, false)).toBe(0);
    expect(registerAnswer("/other", true, true)).toBe(1);
  });
  it("is scoped to one lesson", () => {
    registerAnswer("/a", true, true);
    registerAnswer("/a", true, true);
    function Probe({ scope }: { scope: string }) {
      return <span>{useCombo(scope).count}</span>;
    }
    renderWithProviders(<Probe scope="/b" />);
    expect(screen.getByText("0")).toBeInTheDocument();
  });
});

describe("lesson stars", () => {
  it("measures independence, and a lesson done mostly with help earns none", () => {
    expect(lessonStars(0, 0)).toBeNull();
    expect(lessonStars(6, 6)).toBe(3);
    expect(lessonStars(4, 6)).toBe(2);
    expect(lessonStars(2, 6)).toBe(1);
    expect(lessonStars(0, 6)).toBe(0);
  });
});

describe("quest board", () => {
  it("keeps the chest locked until every quest is complete", () => {
    renderWithProviders(<QuestBoard quests={quests(false)} />);
    expect(screen.getByText("1 of 3")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Rare chest/ })).toBeDisabled();
    expect(screen.getByText(/Inside now: 30 XP · 1 XP boost/)).toBeInTheDocument();
    expect(screen.getByText("Keep a 7-day streak going")).toBeInTheDocument();
  });
  it("opens a ready chest on the server", async () => {
    const { calls } = stubFetch({
      "POST /api/study/chest": () => ({
        body: { claimed: true, xpGained: 25, quests: quests(true, true) },
      }),
    });
    renderWithProviders(<QuestBoard quests={quests(true)} />);
    await userEvent.click(screen.getByRole("button", { name: /Open your Rare chest/ }));
    await waitFor(() =>
      expect(calls.some((call) => call.key === "POST /api/study/chest")).toBe(true),
    );
  });
  it("shows an opened chest without offering it again", () => {
    renderWithProviders(<QuestBoard quests={quests(true, true)} />);
    expect(screen.getByRole("button", { name: /Rare chest opened · \+30 XP/ })).toBeDisabled();
  });
});

describe("quest swaps", () => {
  it("offers a swap on unfinished quests only when one is held", async () => {
    const { calls } = stubFetch({
      "POST /api/study/quests/correct/swap": () => ({
        body: { swapped: true, reason: null, quests: quests(false) },
      }),
    });
    const { rerender } = renderWithProviders(<QuestBoard quests={quests(false)} swaps={0} />);
    expect(screen.queryByRole("button", { name: /Swap/ })).toBeNull();
    rerender(<QuestBoard quests={quests(false)} swaps={1} />);
    // Two unfinished quests can be swapped; the finished one cannot.
    expect(screen.getAllByRole("button", { name: /Swap/ })).toHaveLength(2);
    await userEvent.click(screen.getByRole("button", { name: /Swap Sharp mind/ }));
    await waitFor(() =>
      expect(calls.some((call) => call.key.startsWith("POST /api/study/quests/correct/swap"))).toBe(
        true,
      ),
    );
  });
});

describe("achievement wall", () => {
  it("names the rank and the next target", () => {
    renderWithProviders(
      <AchievementWall
        timeZone="UTC"
        achievements={[
          {
            id: "scholar",
            title: "Scholar",
            description: "Finish lessons.",
            rank: 2,
            thresholds: [1, 5, 15],
            current: 7,
            nextTarget: 15,
            earned: [
              { rank: 1, at: "2026-10-01T10:00:00.000Z" },
              { rank: 2, at: "2026-10-05T10:00:00.000Z" },
            ],
          },
          {
            id: "treasure",
            title: "Treasure Hunter",
            description: "Open chests.",
            rank: 0,
            thresholds: [1],
            current: 0,
            nextTarget: 1,
            earned: [],
          },
        ]}
      />,
    );
    expect(screen.getByText("Rank II of III")).toBeInTheDocument();
    expect(screen.getByText("7 / 15")).toBeInTheDocument();
    expect(screen.getByText("Rank II on 5 Oct")).toBeInTheDocument();
    expect(screen.getByText("Not yet earned")).toBeInTheDocument();
  });
});

const league: League = {
  weekStart: "2026-10-05",
  weekEnd: "2026-10-11",
  daysLeft: 5,
  weekXp: 60,
  tier: { id: "silver", name: "Silver", index: 1 },
  next: { id: "gold", name: "Gold", index: 2 },
  previous: { id: "bronze", name: "Bronze", index: 0 },
  promoteAt: 175,
  holdAt: 40,
  projected: "stay",
  highest: { id: "silver", name: "Silver", index: 1 },
  lastWeekXp: 120,
  lastWeekSoFar: 30,
  bestWeekXp: 120,
  history: Array.from({ length: 8 }, (_, index) => ({
    weekStart: `2026-08-${String(17 + index).padStart(2, "0")}`,
    xp: index * 10,
    tier: "bronze",
    tierName: "Bronze",
    outcome: index === 7 ? ("current" as const) : ("stayed" as const),
  })),
};

describe("league card", () => {
  it("explains the target, the safety line and labels every week", () => {
    renderWithProviders(<LeagueCard league={league} />);
    expect(screen.getByText(/more in 6 days moves you up to Gold/)).toBeInTheDocument();
    expect(screen.getByText(/You are safe in Silver this week/)).toBeInTheDocument();
    expect(screen.getByText("30 XP ahead of last week at this point")).toBeInTheDocument();
    expect(screen.getByText(/Week of 24 Aug: 70 XP in Bronze, this week/)).toBeInTheDocument();
    expect(screen.getByText("How leagues work")).toBeInTheDocument();
  });
});

describe("announcements", () => {
  const base: StudySummary = {
    ...studyFixture,
    quests: quests(false),
    level: { level: 2, xp: 150, fraction: 0.2, levelXp: 100, nextLevelXp: 400, title: "Newcomer" },
  };
  it("announces finished quests, a ready chest and a new level", () => {
    const next: StudySummary = {
      ...base,
      quests: quests(true),
      level: { ...base.level!, level: 3, title: "Apprentice" },
    };
    expect(announcementsBetween(base, next).map((item) => item.tone)).toEqual([
      "quest",
      "quest",
      "chest",
      "level",
    ]);
  });
  it("holds announcements in a lesson and shows them at its finish", () => {
    expect(lessonPhase("/courses/a/lessons/b/stages/b%3Aquiz-1")).toBe("stage");
    expect(lessonPhase("/courses/a/lessons/b/stages/b%3Acompletion")).toBe("finish");
    expect(lessonPhase("/")).toBeNull();
  });
});

describe("home nudge", () => {
  it("greets a new learner with the lesson, not the league", () => {
    expect(nextNudge({ ...studyFixture, firstRun: true })).toMatch(/^Start with your first lesson/);
  });
  it("points at a ready chest first", () => {
    expect(nextNudge({ ...studyFixture, quests: quests(true) })).toBe(
      "Your Rare chest is ready to open.",
    );
  });
});
