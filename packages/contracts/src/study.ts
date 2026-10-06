import { z } from "zod";

const Count = z.number().int().nonnegative();
export const TimeZoneSchema = z
  .string()
  .min(1)
  .max(100)
  .refine((value) => {
    try {
      new Intl.DateTimeFormat("en", { timeZone: value });
      return true;
    } catch {
      return false;
    }
  }, "Choose a valid time zone.");
export const StudyPreferencesSchema = z
  .object({
    timeZone: TimeZoneSchema,
    dailyGoal: z.union([z.literal(3), z.literal(5), z.literal(10)]),
    motion: z.enum(["system", "reduced"]),
    celebrations: z.boolean(),
    sound: z.boolean(),
    /** The companion pet in the corner of the screen. Absent means shown. */
    companion: z.boolean().optional(),
    /** Colour scheme. Absent means dark. */
    theme: z.enum(["dark", "light", "system"]).optional(),
    /** Behind the interface: the animated galaxy, or a still gradient. Absent means galaxy. */
    backdrop: z.enum(["galaxy", "calm"]).optional(),
  })
  .strict();
export type StudyPreferences = z.infer<typeof StudyPreferencesSchema>;
export const StudyPreferencesUpdateSchema = StudyPreferencesSchema.partial().strict();
export type StudyPreferencesUpdate = z.infer<typeof StudyPreferencesUpdateSchema>;

export const StudyDaySchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    answers: Count,
    reviews: Count,
    lessons: Count,
    xp: Count,
    qualified: z.boolean(),
    protected: z.boolean(),
  })
  .strict();
export type StudyDay = z.infer<typeof StudyDaySchema>;
export const QuestSchema = z
  .object({
    id: z.string(),
    icon: z.enum(["target", "brain", "flame", "bolt", "cards", "trophy"]),
    title: z.string(),
    description: z.string(),
    current: Count,
    target: z.number().int().positive(),
    complete: z.boolean(),
  })
  .strict();
export type Quest = z.infer<typeof QuestSchema>;
export const ChestRaritySchema = z.enum(["common", "rare", "epic", "legendary"]);
export type ChestRarity = z.infer<typeof ChestRaritySchema>;
export const InventoryItemIdSchema = z.enum(["streak-freeze", "xp-boost", "quest-swap"]);
export type InventoryItemId = z.infer<typeof InventoryItemIdSchema>;
export const ChestSchema = z
  .object({
    ready: z.boolean(),
    claimed: z.boolean(),
    /** The rarity it opened at once claimed, otherwise the rarity it would open at now. */
    rarity: ChestRaritySchema,
    xp: Count,
    items: z.array(
      z.object({ id: InventoryItemIdSchema, count: z.number().int().positive() }).strict(),
    ),
    /** Each condition met today raises the chest one rarity. */
    upgrades: z.array(
      z
        .object({
          id: z.string(),
          label: z.string(),
          current: Count,
          target: z.number().int().positive(),
          met: z.boolean(),
        })
        .strict(),
    ),
  })
  .strict();
export type Chest = z.infer<typeof ChestSchema>;
export const DailyQuestsSchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    quests: z.array(QuestSchema).length(3),
    chest: ChestSchema,
  })
  .strict();
export type DailyQuests = z.infer<typeof DailyQuestsSchema>;
const LeagueTierRef = z.object({ id: z.string(), name: z.string(), index: Count }).strict();
export const LeagueOutcomeSchema = z.enum(["promoted", "stayed", "dropped", "current", "before"]);
export const LeagueSchema = z
  .object({
    weekStart: z.string(),
    weekEnd: z.string(),
    daysLeft: Count,
    weekXp: Count,
    /** The league held for the whole week; it changes only when the week closes. */
    tier: LeagueTierRef,
    next: LeagueTierRef.nullable(),
    previous: LeagueTierRef.nullable(),
    /** Weekly XP that moves the learner up on Monday, or null at the top league. */
    promoteAt: Count.nullable(),
    /** Weekly XP below which the learner drops a league on Monday; 0 means no drop. */
    holdAt: Count,
    /** What Monday would bring if the week closed now. */
    projected: z.enum(["promote", "stay", "drop"]),
    highest: LeagueTierRef,
    lastWeekXp: Count,
    lastWeekSoFar: Count,
    bestWeekXp: Count,
    history: z.array(
      z
        .object({
          weekStart: z.string(),
          xp: Count,
          tier: z.string(),
          tierName: z.string(),
          outcome: LeagueOutcomeSchema,
        })
        .strict(),
    ),
  })
  .strict();
export type League = z.infer<typeof LeagueSchema>;
export const AchievementSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
    /** Ranks earned so far, 0 to thresholds.length. A one-off achievement has one threshold. */
    rank: Count,
    thresholds: z.array(z.number().int().positive()).min(1),
    current: Count,
    nextTarget: z.number().int().positive().nullable(),
    /** When each earned rank was reached, where the ledger can date it. */
    earned: z.array(
      z.object({ rank: z.number().int().positive(), at: z.string().nullable() }).strict(),
    ),
  })
  .strict();
export type Achievement = z.infer<typeof AchievementSchema>;
export const InventorySchema = z
  .object({
    streakFreezes: Count,
    freezeCap: z.number().int().positive(),
    xpBoosts: Count,
    questSwaps: Count,
    boostMinutes: z.number().int().positive(),
    activeBoost: z.object({ startedAt: z.string(), endsAt: z.string() }).strict().nullable(),
  })
  .strict();
export type Inventory = z.infer<typeof InventorySchema>;
export const LevelSchema = z
  .object({
    level: Count,
    xp: Count,
    fraction: z.number().min(0).max(1),
    levelXp: Count,
    nextLevelXp: Count,
    title: z.string(),
  })
  .strict();
export type Level = z.infer<typeof LevelSchema>;
export const ChestClaimSchema = z
  .object({
    claimed: z.boolean(),
    xpGained: Count,
    rarity: ChestRaritySchema.nullable(),
    items: z.array(
      z.object({ id: InventoryItemIdSchema, count: z.number().int().positive() }).strict(),
    ),
    quests: DailyQuestsSchema,
  })
  .strict();
export type ChestClaim = z.infer<typeof ChestClaimSchema>;

export const StudySummarySchema = z
  .object({
    today: z.string(),
    timeZone: TimeZoneSchema,
    preferences: StudyPreferencesSchema,
    daily: z
      .object({ current: Count, target: z.number().int().positive(), complete: z.boolean() })
      .strict(),
    streak: z
      .object({
        days: Count,
        longest: Count,
        activeToday: z.boolean(),
        charges: Count,
        nextChargeIn: z.number().int().positive(),
      })
      .strict(),
    week: z.array(StudyDaySchema).length(7),
    calendar: z.array(StudyDaySchema),
    totals: z
      .object({
        answers: Count,
        independent: Count,
        reviews: Count,
        lessons: Count,
        transfers: Count,
      })
      .strict(),
    quests: DailyQuestsSchema.optional(),
    league: LeagueSchema.optional(),
    achievements: z.array(AchievementSchema).optional(),
    inventory: InventorySchema.optional(),
    /** True until the learner has done any recorded work at all. */
    firstRun: z.boolean().optional(),
    level: LevelSchema.optional(),
    combo: z.object({ today: Count, best: Count }).strict().optional(),
  })
  .strict();
export type StudySummary = z.infer<typeof StudySummarySchema>;

export const LessonResultSchema = z
  .object({
    lessonId: z.string(),
    completed: z.boolean(),
    completedAt: z.string().datetime().nullable(),
    xp: Count,
    answered: Count,
    correct: Count,
    independent: Count,
    assisted: Count,
    reviews: Count,
  })
  .strict();
export type LessonResult = z.infer<typeof LessonResultSchema>;

export const StudyStatisticsPeriodSchema = z.enum(["all", "week", "month", "year"]);
export type StudyStatisticsPeriod = z.infer<typeof StudyStatisticsPeriodSchema>;
const StudyMetricsSchema = z
  .object({
    answers: Count,
    correct: Count,
    reviews: Count,
    lessons: Count,
    studyDays: Count,
    xp: Count,
  })
  .strict();
export const StudyStatisticsSchema = z
  .object({
    period: StudyStatisticsPeriodSchema,
    today: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    timeZone: TimeZoneSchema,
    totals: StudyMetricsSchema,
    accuracy: z.number().min(0).max(1).nullable(),
    days: z.array(
      z
        .object({
          date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
          answers: Count,
          correct: Count,
          reviews: Count,
          lessons: Count,
          xp: Count,
        })
        .strict(),
    ),
    week: z
      .object({
        from: z.string(),
        to: z.string(),
        totals: StudyMetricsSchema,
      })
      .strict(),
  })
  .strict();
export type StudyStatistics = z.infer<typeof StudyStatisticsSchema>;

export const BoostActivationSchema = z
  .object({ activated: z.boolean(), reason: z.string().nullable(), inventory: InventorySchema })
  .strict();
export type BoostActivation = z.infer<typeof BoostActivationSchema>;
export const QuestSwapSchema = z
  .object({ swapped: z.boolean(), reason: z.string().nullable(), quests: DailyQuestsSchema })
  .strict();
export type QuestSwap = z.infer<typeof QuestSwapSchema>;
