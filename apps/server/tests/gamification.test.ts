import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  BoostActivationSchema,
  ChestClaimSchema,
  QuestSwapSchema,
  StudySummarySchema,
} from "@discere/contracts";
import { createApp } from "../src/app.js";
import type { DiscereStore } from "../src/db/store.js";

let app: FastifyInstance;
let store: DiscereStore;
let instant: string;
beforeEach(async () => {
  instant = "2026-10-06T09:00:00.000Z";
  ({ app, store } = await createApp({
    dbPath: ":memory:",
    migrate: true,
    clock: () => new Date(instant),
  }));
  store.study.updatePreferences({ timeZone: "UTC" });
});
afterEach(async () => {
  await app.close();
});
const summary = async () =>
  StudySummarySchema.parse((await app.inject({ method: "GET", url: "/api/study" })).json());
const claim = async () =>
  ChestClaimSchema.parse((await app.inject({ method: "POST", url: "/api/study/chest" })).json());

/** Every quest in the pool is satisfied by this much honest work in one day. */
function completeEveryQuest() {
  for (let i = 0; i < 12; i += 1) {
    store.study.record({
      key: `answer:a${i}`,
      kind: "answer",
      referenceId: `q${i}`,
      correct: true,
      independent: true,
      qualifying: true,
    });
    store.study.reward(10, `answer:a${i}`);
  }
  store.study.record({
    key: "stage:maths-foundations:x:completion",
    kind: "stage",
    referenceId: "maths-foundations:x",
    correct: false,
    independent: false,
    qualifying: true,
  });
}

describe("quests, league and badges", () => {
  it("summarises the game state from the evidence ledger", async () => {
    const study = await summary();
    expect(study.quests?.quests).toHaveLength(3);
    expect(study.quests?.chest).toMatchObject({ ready: false, claimed: false });
    expect(study.league).toMatchObject({ weekStart: "2026-10-05", weekXp: 0 });
    expect(study.league?.tier.id).toBe("bronze");
    expect(study.achievements?.length).toBe(11);
    expect(study.level).toMatchObject({ level: 1, xp: 0, title: "Newcomer" });
    expect(study.firstRun).toBe(true);
    expect(study.inventory).toMatchObject({ xpBoosts: 0, questSwaps: 0, activeBoost: null });
    expect(study.combo).toEqual({ today: 0, best: 0 });
  });
  it("keeps the day's quests fixed even when more cards fall due later", async () => {
    store.study.dueCardCounter = () => 0;
    const morning = (await summary()).quests!.quests.map((quest) => quest.id);
    // Finishing a lesson introduces cards that are due today, which once swapped "Finisher" out.
    store.study.dueCardCounter = () => 12;
    for (let day = 0; day < 3; day += 1) {
      expect((await summary()).quests!.quests.map((quest) => quest.id)).toEqual(morning);
    }
  });
  it("keeps the chest shut until every quest is complete", async () => {
    const result = await claim();
    expect(result).toMatchObject({ claimed: false, xpGained: 0 });
    expect(store.getProfile().xp).toBe(0);
  });
  it("opens the chest once a day and adds its XP to the week", async () => {
    completeEveryQuest();
    const before = await summary();
    expect(before.quests?.chest.ready).toBe(true);
    expect(before.combo?.today).toBe(12);
    const first = await claim();
    expect(first.claimed).toBe(true);
    expect(first.xpGained).toBe(before.quests?.chest.xp);
    // Twelve on your own and a run of twelve: two upgrades.
    expect(first.rarity).toBe("epic");
    expect(first.xpGained).toBe(45);
    expect(first.items.map((item) => item.id)).toEqual(["xp-boost", "quest-swap"]);
    const second = await claim();
    expect(second).toMatchObject({ claimed: true, xpGained: 0, rarity: null });
    expect(store.getProfile().xp).toBe(120 + first.xpGained);
    const after = await summary();
    expect(after.league?.weekXp).toBe(120 + first.xpGained);
    expect(after.achievements?.find((item) => item.id === "treasure")?.rank).toBe(1);
    expect(after.quests?.chest).toMatchObject({ claimed: true, rarity: "epic" });
    // Level 2 was already held at the first summary, so only the chest's items arrive.
    expect(after.inventory).toMatchObject({ xpBoosts: 1, questSwaps: 1 });
    expect(after.firstRun).toBe(false);
    instant = "2026-10-07T09:00:00.000Z";
    const tomorrow = await summary();
    expect(tomorrow.quests?.chest).toMatchObject({ ready: false, claimed: false });
  });
});

const post = (url: string) => app.inject({ method: "POST", url });

describe("inventory", () => {
  it("pays one XP boost per new level, once, and never for levels held before", async () => {
    store.study.reward(500, "answer:seed"); // level 3 before the first summary
    expect((await summary()).inventory?.xpBoosts).toBe(0);
    store.study.reward(500, "answer:more"); // 1000 XP is level 4
    expect((await summary()).inventory?.xpBoosts).toBe(1);
    expect((await summary()).inventory?.xpBoosts).toBe(1);
  });
  it("boosts learning rewards by half while it runs, then stops", async () => {
    await summary();
    store.study.reward(400, "answer:seed"); // levels 2 and 3: two boosts
    expect((await summary()).inventory?.xpBoosts).toBe(2);
    const started = BoostActivationSchema.parse((await post("/api/study/boost")).json());
    expect(started.activated).toBe(true);
    expect(started.inventory.activeBoost?.endsAt).toBe("2026-10-06T09:30:00.000Z");
    const again = BoostActivationSchema.parse((await post("/api/study/boost")).json());
    expect(again).toMatchObject({ activated: false });
    const xp = store.getProfile().xp;
    store.study.reward(20, "answer:boosted");
    expect(store.getProfile().xp).toBe(xp + 30);
    const bonus = store.study.events().filter((event) => event.key.startsWith("boost:"));
    expect(bonus).toMatchObject([{ referenceId: "answer:boosted", xp: 10 }]);
    instant = "2026-10-06T09:31:00.000Z";
    store.study.reward(20, "answer:late");
    expect(store.getProfile().xp).toBe(xp + 50);
    expect((await summary()).inventory?.activeBoost).toBeNull();
  });
  it("refuses a boost the learner does not hold", async () => {
    const result = BoostActivationSchema.parse((await post("/api/study/boost")).json());
    expect(result).toMatchObject({ activated: false, reason: "You have no XP boosts." });
  });
  it("swaps an unfinished quest only by spending a swap", async () => {
    const before = (await summary()).quests!.quests.map((quest) => quest.id);
    const refused = QuestSwapSchema.parse(
      (await post(`/api/study/quests/${before[1]}/swap`)).json(),
    );
    expect(refused).toMatchObject({ swapped: false, reason: "You have no quest swaps." });
    store.database
      .prepare(
        "INSERT INTO inventory_ledger (user_id, entry_key, item, delta, reason, occurred_at) VALUES ('local-user', 'test', 'quest-swap', 1, 'test', ?)",
      )
      .run(instant);
    const swapped = QuestSwapSchema.parse(
      (await post(`/api/study/quests/${before[1]}/swap`)).json(),
    );
    expect(swapped.swapped).toBe(true);
    const after = swapped.quests.quests.map((quest) => quest.id);
    expect(after[0]).toBe(before[0]);
    expect(after[2]).toBe(before[2]);
    expect(before).not.toContain(after[1]);
    expect((await summary()).quests!.quests.map((quest) => quest.id)).toEqual(after);
    expect((await summary()).inventory?.questSwaps).toBe(0);
  });
});
