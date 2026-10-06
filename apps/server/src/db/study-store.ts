import { randomUUID } from "node:crypto";
import {
  type BoostActivation,
  type ChestClaim,
  type ChestRarity,
  ChestRaritySchema,
  type DailyQuests,
  type Inventory,
  type InventoryItemId,
  type QuestSwap,
  type StudyDay,
  type StudyPreferences,
  StudyPreferencesSchema,
  type StudyPreferencesUpdate,
  type StudySummary,
} from "@discere/contracts";
import {
  achievements,
  bestCombo,
  boostBonus,
  dailyQuests,
  league,
  levelProgress,
  levelTitle,
  swapQuest,
  XP_BOOST,
  localStudyDay,
  longestStudyStreak,
  offsetStudyDay,
  recoverStudyStreak,
  type StudyEvent,
  streakLength,
  studyDays,
} from "@discere/progression-engine";
import type Database from "better-sqlite3";

const USER = "local-user";
const FREEZE_CAP = 2;
type EventInput = Omit<StudyEvent, "occurredAt" | "updatedAt" | "xp">;
export class StudyStore {
  /**
   * Counts cards the learner can actually be shown that fall due by an instant. Routes register
   * the visible-queue rule; without it no card counts, so no review quest is offered.
   */
  dueCardCounter: (until: string) => number = () => 0;
  constructor(
    private readonly database: Database.Database,
    private readonly now: () => string,
  ) {}

  preferences(): StudyPreferences {
    const defaultZone =
      process.env["DISCERE_TIME_ZONE"] || Intl.DateTimeFormat().resolvedOptions().timeZone;
    const defaults = StudyPreferencesSchema.parse({
      timeZone: defaultZone,
      dailyGoal: 5,
      motion: "system",
      celebrations: true,
      sound: true,
    });
    this.database
      .prepare(
        "INSERT OR IGNORE INTO study_preferences (user_id, time_zone, sound) VALUES (?, ?, 1)",
      )
      .run(USER, defaults.timeZone);
    const row = this.database
      .prepare(
        "SELECT time_zone AS timeZone, daily_goal AS dailyGoal, motion, celebrations, sound, companion, theme, backdrop FROM study_preferences WHERE user_id = ?",
      )
      .get(USER) as Record<string, unknown>;
    return StudyPreferencesSchema.parse({
      ...row,
      celebrations: Boolean(row["celebrations"]),
      sound: Boolean(row["sound"]),
      companion: row["companion"] === undefined ? true : Boolean(row["companion"]),
      theme: row["theme"] ?? "dark",
      backdrop: row["backdrop"] ?? "galaxy",
    });
  }
  updatePreferences(update: StudyPreferencesUpdate): StudyPreferences {
    const next = StudyPreferencesSchema.parse({ ...this.preferences(), ...update });
    this.database
      .prepare(
        "UPDATE study_preferences SET time_zone = ?, daily_goal = ?, motion = ?, celebrations = ?, sound = ?, companion = ?, theme = ?, backdrop = ? WHERE user_id = ?",
      )
      .run(
        next.timeZone,
        next.dailyGoal,
        next.motion,
        Number(next.celebrations),
        Number(next.sound),
        Number(next.companion ?? true),
        next.theme ?? "dark",
        next.backdrop ?? "galaxy",
        USER,
      );
    return next;
  }

  /** Called within the same transaction as the action. A replay preserves its first timestamp. */
  record(input: EventInput): void {
    const now = this.now();
    this.database
      .prepare(`INSERT INTO learning_events (user_id, event_key, kind, reference_id, occurred_at, updated_at, correct, independent, qualifying)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(user_id, event_key) DO UPDATE SET
      updated_at = excluded.updated_at, correct = excluded.correct, independent = excluded.independent,
      qualifying = MAX(learning_events.qualifying, excluded.qualifying)`)
      .run(
        USER,
        input.key,
        input.kind,
        input.referenceId,
        now,
        now,
        Number(input.correct),
        Number(input.independent),
        Number(input.qualifying),
      );
  }
  has(key: string): boolean {
    return Boolean(
      this.database
        .prepare("SELECT 1 FROM learning_events WHERE user_id = ? AND event_key = ?")
        .get(USER, key),
    );
  }
  /**
   * The reward and its timestamp are recorded together; statistics do not infer XP from visits.
   * While an XP boost runs, the bonus is a separate reward row on the same reference, so a
   * lesson's result counts it and the ledger shows exactly what the boost added.
   */
  reward(amount: number, referenceId: string): void {
    if (amount <= 0) return;
    const now = this.now();
    const insert = (key: string, xp: number) => {
      this.database
        .prepare("UPDATE user_profiles SET xp = xp + ?, updated_at = ? WHERE id = ?")
        .run(xp, now, USER);
      this.database
        .prepare(
          "INSERT INTO learning_events (user_id, event_key, kind, reference_id, occurred_at, updated_at, xp) VALUES (?, ?, 'reward', ?, ?, ?, ?)",
        )
        .run(USER, key, referenceId, now, now, xp);
    };
    insert(`reward:${randomUUID()}`, amount);
    const bonus = this.activeBoost(now) ? boostBonus(amount) : 0;
    if (bonus > 0) insert(`boost:${randomUUID()}`, bonus);
  }

  /* ------------------------------------------------------------ inventory */

  private activeBoost(now: string): { startedAt: string; endsAt: string } | null {
    return (
      (this.database
        .prepare(
          "SELECT started_at AS startedAt, ends_at AS endsAt FROM xp_boosts WHERE user_id = ? AND started_at <= ? AND ends_at > ? ORDER BY started_at DESC LIMIT 1",
        )
        .get(USER, now, now) as { startedAt: string; endsAt: string } | undefined) ?? null
    );
  }
  private balance(item: InventoryItemId): number {
    return (
      this.database
        .prepare(
          "SELECT COALESCE(SUM(delta), 0) AS total FROM inventory_ledger WHERE user_id = ? AND item = ?",
        )
        .get(USER, item) as { total: number }
    ).total;
  }
  /** Idempotent by key: a replayed grant or spend changes nothing. */
  private grant(key: string, item: string, delta: number, reason: string): boolean {
    return (
      this.database
        .prepare(
          "INSERT OR IGNORE INTO inventory_ledger (user_id, entry_key, item, delta, reason, occurred_at) VALUES (?, ?, ?, ?, ?, ?)",
        )
        .run(USER, key, item, delta, reason, this.now()).changes > 0
    );
  }
  private freezeCharges(): number {
    this.database.prepare("INSERT OR IGNORE INTO streak_wallet (user_id) VALUES (?)").run(USER);
    return (
      this.database.prepare("SELECT charges FROM streak_wallet WHERE user_id = ?").get(USER) as {
        charges: number;
      }
    ).charges;
  }
  private inventory(freezes: number): Inventory {
    return {
      streakFreezes: freezes,
      freezeCap: FREEZE_CAP,
      xpBoosts: this.balance("xp-boost"),
      questSwaps: this.balance("quest-swap"),
      boostMinutes: XP_BOOST.minutes,
      activeBoost: this.activeBoost(this.now()),
    };
  }
  /** Spends one boost and starts it now. Only one boost runs at a time. */
  activateBoost(): BoostActivation {
    return this.database.transaction((): BoostActivation => {
      const now = this.now();
      const refuse = (reason: string): BoostActivation => ({
        activated: false,
        reason,
        inventory: this.inventory(this.freezeCharges()),
      });
      if (this.activeBoost(now)) return refuse("A boost is already running.");
      if (this.balance("xp-boost") < 1) return refuse("You have no XP boosts.");
      this.grant(`boost-use:${randomUUID()}`, "xp-boost", -1, "activated");
      const ends = new Date(Date.parse(now) + XP_BOOST.minutes * 60_000).toISOString();
      this.database
        .prepare("INSERT INTO xp_boosts (user_id, started_at, ends_at) VALUES (?, ?, ?)")
        .run(USER, now, ends);
      return { activated: true, reason: null, inventory: this.inventory(this.freezeCharges()) };
    })();
  }
  /** Replaces one unfinished quest for today with another that can still be done. */
  swapQuest(questId: string): QuestSwap {
    return this.database.transaction((): QuestSwap => {
      const summary = this.buildSummary();
      const quests = summary.quests!;
      const refuse = (reason: string): QuestSwap => ({ swapped: false, reason, quests });
      if (quests.chest.claimed) return refuse("Today's chest is already open.");
      if (this.balance("quest-swap") < 1) return refuse("You have no quest swaps.");
      const ids = quests.quests.map((quest) => quest.id);
      const preferences = this.preferences();
      const replacement = swapQuest(
        this.events().filter((event) => event.occurredAt <= this.now()),
        {
          today: summary.today,
          timeZone: preferences.timeZone,
          dailyGoal: preferences.dailyGoal,
          reviewableToday: this.reviewableToday(summary.today, preferences.timeZone),
          chestClaimed: false,
          fixedIds: ids,
        },
        questId,
      );
      if (!replacement) return refuse("That quest cannot be swapped.");
      const next = ids.map((id) => (id === questId ? replacement : id));
      this.database
        .prepare("UPDATE daily_quest_sets SET quest_ids = ? WHERE user_id = ? AND date = ?")
        .run(JSON.stringify(next), USER, summary.today);
      this.grant(`swap-use:${randomUUID()}`, "quest-swap", -1, `${questId}->${replacement}`);
      return { swapped: true, reason: null, quests: this.buildSummary().quests! };
    })();
  }
  /** Each level reached after this feature arrived pays one XP boost, once. */
  private rewardLevels(level: number): void {
    const row = this.database
      .prepare("SELECT level_rewarded AS level FROM game_state WHERE user_id = ?")
      .get(USER) as { level: number } | undefined;
    if (!row) {
      this.database
        .prepare("INSERT INTO game_state (user_id, level_rewarded) VALUES (?, ?)")
        .run(USER, level);
      return;
    }
    if (level <= row.level) return;
    for (let reached = row.level + 1; reached <= level; reached += 1)
      this.grant(`level:${reached}`, "xp-boost", 1, `level ${reached}`);
    this.database
      .prepare("UPDATE game_state SET level_rewarded = ? WHERE user_id = ?")
      .run(level, USER);
  }

  events(): StudyEvent[] {
    const rows = this.database
      .prepare(
        "SELECT event_key AS key, kind, reference_id AS referenceId, occurred_at AS occurredAt, updated_at AS updatedAt, xp, correct, independent, qualifying FROM learning_events WHERE user_id = ? ORDER BY occurred_at, rowid",
      )
      .all(USER) as Array<StudyEvent>;
    return rows.map((row) => ({
      ...row,
      correct: Boolean(row.correct),
      independent: Boolean(row.independent),
      qualifying: Boolean(row.qualifying),
    }));
  }

  /** Cards that were due at some point today, whether or not they have been answered yet. */
  private reviewableToday(today: string, timeZone: string): number {
    // The first whole hour that falls on the next local day closes today's window.
    let cursor = Date.parse(this.now());
    while (localStudyDay(new Date(cursor).toISOString(), timeZone) === today) cursor += 3_600_000;
    const end = new Date(cursor).toISOString();
    const due = this.dueCardCounter(end);
    const done = new Set(
      this.events()
        .filter((e) => e.kind === "review" && e.qualifying)
        .filter((e) => localStudyDay(e.occurredAt, timeZone) === today)
        .map((e) => e.referenceId),
    ).size;
    return due + done;
  }
  private claimedRarity(today: string): ChestRarity | null {
    const row = this.database
      .prepare("SELECT reason FROM inventory_ledger WHERE user_id = ? AND entry_key = ?")
      .get(USER, `chest:${today}:opened`) as { reason: string } | undefined;
    if (row) return ChestRaritySchema.parse(row.reason);
    // Chests opened before rarities existed were the plain kind.
    return this.has(`chest:${today}`) ? "common" : null;
  }
  /**
   * The first summary of a study day chooses its quests and stores them; every later summary
   * that day reuses them, so progress can never swap a quest for another. Only a quest swap,
   * spent by the learner, changes the stored set.
   */
  private quests(events: StudyEvent[], today: string, streakDays: number): DailyQuests {
    const preferences = this.preferences();
    const stored = this.database
      .prepare("SELECT quest_ids AS ids FROM daily_quest_sets WHERE user_id = ? AND date = ?")
      .get(USER, today) as { ids: string } | undefined;
    const quests = dailyQuests(events, {
      today,
      timeZone: preferences.timeZone,
      dailyGoal: preferences.dailyGoal,
      reviewableToday: stored ? 0 : this.reviewableToday(today, preferences.timeZone),
      chestClaimed: this.has(`chest:${today}`),
      claimedRarity: this.claimedRarity(today),
      streakDays,
      freezesFull: this.freezeCharges() >= FREEZE_CAP,
      ...(stored ? { fixedIds: JSON.parse(stored.ids) as string[] } : {}),
    });
    if (!stored)
      this.database
        .prepare(
          "INSERT OR IGNORE INTO daily_quest_sets (user_id, date, quest_ids, created_at) VALUES (?, ?, ?, ?)",
        )
        .run(USER, today, JSON.stringify(quests.quests.map((quest) => quest.id)), this.now());
    return quests;
  }
  /**
   * The chest opens once per study day, and only after all three quests are complete. Its rarity
   * is fixed at the moment it opens, from work already done today.
   */
  claimChest(): ChestClaim {
    return this.database.transaction((): ChestClaim => {
      const now = this.now();
      const summary = this.buildSummary();
      const today = summary.today;
      const before = summary.quests!;
      if (!before.chest.ready || before.chest.claimed)
        return {
          claimed: before.chest.claimed,
          xpGained: 0,
          rarity: null,
          items: [],
          quests: before,
        };
      const { rarity, xp, items } = before.chest;
      this.database
        .prepare("UPDATE user_profiles SET xp = xp + ?, updated_at = ? WHERE id = ?")
        .run(xp, now, USER);
      this.database
        .prepare(
          "INSERT INTO learning_events (user_id, event_key, kind, reference_id, occurred_at, updated_at, xp) VALUES (?, ?, 'reward', ?, ?, ?, ?)",
        )
        .run(USER, `chest:${today}`, `chest:${today}`, now, now, xp);
      this.grant(`chest:${today}:opened`, "chest", 1, rarity);
      const granted: ChestClaim["items"] = [];
      for (const item of items) {
        if (item.id === "streak-freeze") {
          const charges = this.freezeCharges();
          if (charges >= FREEZE_CAP) continue;
          this.database
            .prepare("UPDATE streak_wallet SET charges = ? WHERE user_id = ?")
            .run(Math.min(FREEZE_CAP, charges + item.count), USER);
          this.grant(`chest:${today}:${item.id}`, item.id, 0, "added to the streak wallet");
        } else this.grant(`chest:${today}:${item.id}`, item.id, item.count, `${rarity} chest`);
        granted.push(item);
      }
      return {
        claimed: true,
        xpGained: xp,
        rarity,
        items: granted,
        quests: this.buildSummary().quests!,
      };
    })();
  }
  private totalXp(): number {
    const row = this.database.prepare("SELECT xp FROM user_profiles WHERE id = ?").get(USER) as
      | { xp: number }
      | undefined;
    return row?.xp ?? 0;
  }

  summary(): StudySummary {
    return this.database.transaction(() => this.buildSummary())();
  }
  private buildSummary(): StudySummary {
    const now = this.now();
    const preferences = this.preferences();
    const today = localStudyDay(now, preferences.timeZone);
    const events = this.events().filter((event) => event.occurredAt <= now);
    const days = studyDays(events, now, preferences.timeZone);
    const realDates = new Set(days.filter((day) => day.qualified).map((day) => day.date));
    this.database.prepare("INSERT OR IGNORE INTO streak_wallet (user_id) VALUES (?)").run(USER);
    const wallet = this.database
      .prepare("SELECT charges, rewarded_days AS rewardedDays FROM streak_wallet WHERE user_id = ?")
      .get(USER) as { charges: number; rewardedDays: number };
    const rewardedDays = Math.floor(realDates.size / 7) * 7;
    const charges = Math.min(
      2,
      wallet.charges + Math.max(0, (rewardedDays - wallet.rewardedDays) / 7),
    );
    const protectedDates = new Set(
      (
        this.database
          .prepare("SELECT date FROM streak_protections WHERE user_id = ? AND date < ?")
          .all(USER, today) as Array<{ date: string }>
      ).map((row) => row.date),
    );
    const recovery = recoverStudyStreak(realDates, protectedDates, today, charges);
    for (const date of recovery.dates) {
      this.database
        .prepare(
          "INSERT OR IGNORE INTO streak_protections (user_id, date, created_at) VALUES (?, ?, ?)",
        )
        .run(USER, date, now);
      protectedDates.add(date);
    }
    this.database
      .prepare(
        "UPDATE streak_wallet SET charges = ?, rewarded_days = MAX(rewarded_days, ?) WHERE user_id = ?",
      )
      .run(recovery.remaining, rewardedDays, USER);
    const streakDates = new Set([...realDates, ...protectedDates]);
    const byDate = new Map(days.map((day) => [day.date, day]));
    const dayAt = (date: string): StudyDay => ({
      ...(byDate.get(date) ?? {
        date,
        answers: 0,
        reviews: 0,
        lessons: 0,
        xp: 0,
        qualified: false,
        protected: false,
      }),
      protected: protectedDates.has(date),
    });
    const current = dayAt(today);
    const weekday = (new Date(`${today}T12:00:00Z`).getUTCDay() + 6) % 7;
    const monday = offsetStudyDay(today, -weekday);
    const answers = events.filter((event) => event.kind === "answer" && event.qualifying);
    const independent = answers.filter((event) => event.correct && event.independent);
    const reviews = events.filter((event) => event.kind === "review" && event.qualifying);
    const lessons = events.filter(
      (event) => event.kind === "stage" && event.key.endsWith(":completion"),
    );
    const transfers = events.filter((event) => event.kind === "transfer" && event.correct);
    const unique = (list: StudyEvent[]) =>
      [...new Map(list.map((event) => [event.referenceId, event])).values()].sort((a, b) =>
        a.occurredAt.localeCompare(b.occurredAt),
      );
    const totalXp = this.totalXp();
    const level = levelProgress(totalXp);
    const longest = longestStudyStreak(streakDates);
    const streakDays = streakLength(streakDates, today);
    const leagueState = league(events, today, preferences.timeZone);
    this.rewardLevels(level.level + 1);
    const todays = events.filter(
      (event) => localStudyDay(event.occurredAt, preferences.timeZone) === today,
    );
    return {
      today,
      timeZone: preferences.timeZone,
      preferences,
      daily: {
        current: current.answers + current.reviews,
        target: preferences.dailyGoal,
        complete: current.answers + current.reviews >= preferences.dailyGoal || current.lessons > 0,
      },
      streak: {
        days: streakDays,
        longest,
        activeToday: realDates.has(today),
        charges: recovery.remaining,
        nextChargeIn: 7 - (realDates.size % 7),
      },
      week: Array.from({ length: 7 }, (_, index) => dayAt(offsetStudyDay(monday, index))),
      calendar: Array.from({ length: 70 }, (_, index) => dayAt(offsetStudyDay(today, index - 69))),
      totals: {
        answers: unique(answers).length,
        independent: unique(independent).length,
        reviews: reviews.length,
        lessons: lessons.length,
        transfers: unique(transfers).length,
      },
      quests: this.quests(events, today, streakDays),
      league: leagueState,
      achievements: achievements({
        events,
        studyDates: [...realDates].sort(),
        longestStreak: longest,
        highestLeague: leagueState.highest.index,
        timeZone: preferences.timeZone,
      }),
      inventory: this.inventory(recovery.remaining),
      firstRun: totalXp === 0 && !events.some((event) => event.qualifying || event.xp > 0),
      level: {
        // Displayed levels start at 1, as on the progress page.
        level: level.level + 1,
        xp: totalXp,
        fraction: level.fraction,
        levelXp: level.level * level.level * 100,
        nextLevelXp: level.nextLevelXp,
        title: levelTitle(level.level + 1),
      },
      combo: { today: bestCombo(todays), best: bestCombo(events) },
    };
  }
}
