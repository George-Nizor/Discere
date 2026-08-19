import { createHash, randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import path from "node:path";
import type {
  Concept,
  ConceptProgress,
  ConceptState,
  JourneyProgress,
  JourneyStageType,
  StageProgressRequest,
  StageState,
  TutoringMode,
  WritingLintResponse,
} from "@discere/contracts";
import {
  activityDay,
  computeStreakDays,
  stageCompletionXp,
  type CourseQueueEntry,
  type Flashcard,
  interleaveByCourse,
  type ReviewEvidence,
  type ReviewOutcome,
  type ReviewPhase,
  type ReviewRating,
  type ReviewState,
  scheduleReview,
} from "@discere/progression-engine";
import Database from "better-sqlite3";
import { assertSchemaReady, runMigrations } from "./migrations.js";

const LOCAL_USER_ID = "local-user";
const REVIEW_PHASES = new Set<ReviewPhase>(["new", "learning", "review", "relearning"]);

export interface AttemptRow {
  id: string;
  userId: string;
  questionId: string;
  response: string;
  mode: TutoringMode;
  correct: boolean;
  feedback: string;
  hintCount: number;
  answerRevealed: boolean;
  xpAwarded: number;
  mastery: number;
  createdAt: string;
  updatedAt: string;
}
export interface AttemptWrite {
  id?: string;
  questionId: string;
  response: string;
  mode: TutoringMode;
  correct: boolean;
  feedback: string;
  xpAwarded: number;
  mastery: number;
  conceptIds: string[];
  conceptMastery: Record<string, number>;
  independent: boolean;
}
export interface RevealRow {
  token: string;
  attemptId: string;
  reason: string;
  availableAt: string;
  usedAt: string | null;
  createdAt: string;
}
export interface EssayDraftRow {
  essayId: string;
  content: string;
  submitted: boolean;
  updatedAt: string | null;
}
export interface EssayAssessmentRow {
  essayId: string;
  requestId: string;
  status: string;
  provider: string;
  accepted: boolean;
  assessmentJson: string | null;
  issuesJson: string;
  errorCode: string | null;
  errorMessage: string | null;
  updatedAt: string;
}
export type EssayAssessmentWrite = Omit<EssayAssessmentRow, "updatedAt">;
export interface ReviewCardRow {
  card: Flashcard;
  state: ReviewState;
  /** The course that authored the card, so the queue can take turns between courses. */
  courseId: string;
}
export interface CourseDueCount {
  courseId: string;
  dueCount: number;
  cardCount: number;
  nextDueAt: string | null;
}
export interface ReviewSessionRow {
  id: string;
  cardId: string;
  revealed: boolean;
  rated: boolean;
  createdAt: string;
}

function bool(value: unknown): boolean {
  return value === 1 || value === true;
}

export interface StoreOptions {
  /**
   * Applies pending migrations instead of demanding an already-migrated database. The
   * migration script, tests, and the smoke harness own their databases; the server does not.
   */
  migrate?: boolean;
  /**
   * Supplies the current instant. Streak counting and review scheduling both read it, so a
   * test can move the workspace through several days without waiting for them.
   */
  clock?: () => Date;
}

export class DiscereStore {
  readonly database: Database.Database;
  private readonly clock: () => Date;
  constructor(databasePath: string, options: StoreOptions = {}) {
    if (databasePath !== ":memory:") mkdirSync(path.dirname(databasePath), { recursive: true });
    this.clock = options.clock ?? (() => new Date());
    this.database = new Database(databasePath);
    this.database.pragma("journal_mode = WAL");
    this.database.pragma("foreign_keys = ON");
    if (options.migrate === true) runMigrations(this.database);
    else assertSchemaReady(this.database, databasePath);
    this.ensureUser();
  }

  /** The current instant as an ISO 8601 string, from the injected clock. */
  now(): string {
    return this.clock().toISOString();
  }

  private ensureUser(): void {
    const timestamp = this.now();
    const learnerName = process.env["DISCERE_LEARNER_NAME"]?.trim() || "Learner";
    this.database
      .prepare(
        "INSERT OR IGNORE INTO user_profiles (id, learner_name, xp, streak_days, created_at, updated_at) VALUES (?, ?, 0, 0, ?, ?)",
      )
      .run(LOCAL_USER_ID, learnerName, timestamp, timestamp);
  }

  /**
   * Opens the concepts a learner can start with. A concept with no prerequisites is available
   * immediately, which stays correct however many courses the library holds.
   */
  initialiseConcepts(concepts: Concept[]): void {
    const statement = this.database.prepare(
      "INSERT OR IGNORE INTO concept_progress (user_id, concept_id, state, mastery, independent_attempts, assisted_attempts, updated_at) VALUES (?, ?, ?, 0, 0, 0, ?)",
    );
    const transaction = this.database.transaction(() => {
      for (const concept of concepts) {
        statement.run(
          LOCAL_USER_ID,
          concept.id,
          concept.prerequisiteIds.length === 0 ? "available" : "locked",
          this.now(),
        );
      }
    });
    transaction();
  }

  /**
   * The most recent stage a learner touched in each course. Journey identifiers are
   * `courseId:lessonId`, so the course is read back from the identifier itself.
   */
  courseActivity(): Map<string, { lastActiveAt: string | null; lessonId: string | null }> {
    const rows = this.database
      .prepare(
        "SELECT journey_id AS journeyId, MAX(updated_at) AS updatedAt FROM journey_progress WHERE user_id = ? GROUP BY journey_id ORDER BY updatedAt DESC",
      )
      .all(LOCAL_USER_ID) as Array<{ journeyId: string; updatedAt: string }>;
    const activity = new Map<string, { lastActiveAt: string | null; lessonId: string | null }>();
    for (const row of rows) {
      const separator = row.journeyId.indexOf(":");
      if (separator <= 0) continue;
      const courseId = row.journeyId.slice(0, separator);
      const lessonId = row.journeyId.slice(separator + 1);
      const current = activity.get(courseId);
      if (current && (current.lastActiveAt ?? "") >= row.updatedAt) continue;
      activity.set(courseId, { lastActiveAt: row.updatedAt, lessonId });
    }
    return activity;
  }

  /**
   * Lessons the learner has finished, per course. A lesson counts once every stage it recorded
   * is done, which is what the catalogue's progress ring reports.
   */
  completedLessonsByCourse(): Map<string, number> {
    const rows = this.database
      .prepare(
        `SELECT journey_id AS journeyId,
                SUM(CASE WHEN state IN ('completed', 'skipped_optional') THEN 0 ELSE 1 END) AS unfinished
         FROM journey_progress WHERE user_id = ? GROUP BY journey_id`,
      )
      .all(LOCAL_USER_ID) as Array<{ journeyId: string; unfinished: number }>;
    const counts = new Map<string, number>();
    for (const row of rows) {
      if (row.unfinished > 0) continue;
      const separator = row.journeyId.indexOf(":");
      if (separator <= 0) continue;
      const courseId = row.journeyId.slice(0, separator);
      counts.set(courseId, (counts.get(courseId) ?? 0) + 1);
    }
    return counts;
  }

  /** Journey ids the learner has finished every recorded stage of, as `courseId:lessonId`. */
  completedJourneyIds(): Set<string> {
    const rows = this.database
      .prepare(
        `SELECT journey_id AS journeyId,
                SUM(CASE WHEN state IN ('completed', 'skipped_optional') THEN 0 ELSE 1 END) AS unfinished
         FROM journey_progress WHERE user_id = ? GROUP BY journey_id`,
      )
      .all(LOCAL_USER_ID) as Array<{ journeyId: string; unfinished: number }>;
    return new Set(rows.filter((row) => row.unfinished === 0).map((row) => row.journeyId));
  }

  /** Review cards ready right now, across every course. */
  dueReviewCount(): number {
    const row = this.database
      .prepare("SELECT COUNT(*) AS due FROM review_cards WHERE user_id = ? AND due_at <= ?")
      .get(LOCAL_USER_ID, this.now()) as { due: number } | undefined;
    return row?.due ?? 0;
  }

  /**
   * Minutes studied today, inferred from the spacing of recorded activity rather than from a
   * timer. Consecutive events less than a break apart are one sitting; a longer gap ends it.
   * A single lone event still counts as having done something, so the number is never zero on
   * a day the learner worked.
   */
  todayMinutes(): number {
    const today = activityDay(this.now());
    const stamps = this.studyTimestamps()
      .filter((stamp) => stamp && activityDay(stamp) === today)
      .map((stamp) => Date.parse(stamp))
      .filter((value) => Number.isFinite(value))
      .sort((left, right) => left - right);
    if (stamps.length === 0) return 0;
    const BREAK_MS = 10 * 60 * 1000;
    let total = 0;
    let sittingStart = stamps[0] as number;
    let previous = stamps[0] as number;
    for (const stamp of stamps.slice(1)) {
      if (stamp - previous > BREAK_MS) {
        total += previous - sittingStart;
        sittingStart = stamp;
      }
      previous = stamp;
    }
    total += previous - sittingStart;
    return Math.max(1, Math.round(total / 60_000));
  }

  /** Completions per UTC day since `from`, for the streak calendar. */
  activityByDay(fromDay: string): Array<{ date: string; completions: number }> {
    const rows = this.database
      .prepare(
        `SELECT substr(updated_at, 1, 10) AS date, COUNT(*) AS completions
         FROM journey_progress
         WHERE user_id = ? AND state IN ('completed', 'skipped_optional') AND updated_at >= ?
         GROUP BY date ORDER BY date`,
      )
      .all(LOCAL_USER_ID, `${fromDay}T00:00:00.000Z`) as Array<{
      date: string;
      completions: number;
    }>;
    return rows;
  }

  /**
   * Every instant the learner did recorded study: answering a question, working a transfer
   * challenge, or rating a review. The streak counts distinct days from this, so it can never
   * report a day on which nothing happened.
   */
  studyTimestamps(): string[] {
    const rows = this.database
      .prepare(
        `SELECT created_at AS at FROM attempts WHERE user_id = ?
         UNION ALL SELECT updated_at AS at FROM attempts WHERE user_id = ?
         UNION ALL SELECT created_at AS at FROM transfer_attempts
         UNION ALL SELECT last_reviewed_at AS at FROM review_cards WHERE user_id = ? AND last_reviewed_at IS NOT NULL`,
      )
      .all(LOCAL_USER_ID, LOCAL_USER_ID, LOCAL_USER_ID) as Array<{ at: string }>;
    return rows.map((row) => row.at);
  }

  /** Consecutive days of recorded study, recomputed from the activity itself. */
  streakDays(): number {
    return computeStreakDays(this.studyTimestamps(), this.now());
  }

  getProfile(): { learnerName: string; xp: number; streakDays: number } {
    const row = this.database
      .prepare("SELECT learner_name AS learnerName, xp FROM user_profiles WHERE id = ?")
      .get(LOCAL_USER_ID) as { learnerName: string; xp: number } | undefined;
    if (!row) throw new Error("Local learner profile is missing.");
    const streakDays = this.streakDays();
    // The column is kept in step so an inspection of the database sees the same number the
    // learner does, but the answer always comes from the activity rather than from the column.
    this.database
      .prepare("UPDATE user_profiles SET streak_days = ? WHERE id = ? AND streak_days != ?")
      .run(streakDays, LOCAL_USER_ID, streakDays);
    return { ...row, streakDays };
  }

  getProgress(): Array<Omit<ConceptProgress, "title">> {
    return (
      this.database
        .prepare(
          "SELECT concept_id AS conceptId, state, mastery, independent_attempts AS independentAttempts, assisted_attempts AS assistedAttempts FROM concept_progress WHERE user_id = ? ORDER BY rowid",
        )
        .all(LOCAL_USER_ID) as Array<{
        conceptId: string;
        state: ConceptState;
        mastery: number;
        independentAttempts: number;
        assistedAttempts: number;
      }>
    ).map((row) => ({ ...row }));
  }

  getMastery(conceptId: string): number {
    const row = this.database
      .prepare("SELECT mastery FROM concept_progress WHERE user_id = ? AND concept_id = ?")
      .get(LOCAL_USER_ID, conceptId) as { mastery: number } | undefined;
    return row?.mastery ?? 0;
  }

  getJourneyProgress(journeyId: string, stageOrder: string[]): JourneyProgress {
    const rows = this.database
      .prepare(
        "SELECT stage_id AS stageId, state, interaction_state AS interactionState, updated_at AS updatedAt FROM journey_progress WHERE user_id = ? AND journey_id = ?",
      )
      .all(LOCAL_USER_ID, journeyId) as Array<{
      stageId: string;
      state: StageState;
      interactionState: string;
      updatedAt: string;
    }>;
    const byId = new Map(
      rows.map((row) => {
        let interactionState: Record<string, unknown> = {};
        try {
          interactionState = JSON.parse(row.interactionState) as Record<string, unknown>;
        } catch {
          interactionState = {};
        }
        return [
          row.stageId,
          { stageId: row.stageId, state: row.state, interactionState, updatedAt: row.updatedAt },
        ];
      }),
    );
    let previousComplete = true;
    const stages = stageOrder.map((stageId) => {
      const saved = byId.get(stageId);
      if (saved) {
        previousComplete = saved.state === "completed" || saved.state === "skipped_optional";
        return saved;
      }
      const state: StageState = previousComplete ? "available" : "locked";
      previousComplete = false;
      return { stageId, state, interactionState: {}, updatedAt: this.now() };
    });
    const active =
      stages.find((stage) => stage.state === "active") ??
      stages.find((stage) => stage.state === "available") ??
      stages[stages.length - 1];
    return { journeyId, activeStageId: active?.stageId ?? stageOrder[0] ?? "", stages };
  }

  saveStageProgress(
    journeyId: string,
    stageOrder: string[],
    input: StageProgressRequest,
    /** Stage type, so finishing a stage with no question behind it is still worth something. */
    stageType?: JourneyStageType,
  ): JourneyProgress {
    if (!stageOrder.includes(input.stageId))
      throw new Error(`Stage '${input.stageId}' is not part of journey '${journeyId}'.`);
    const timestamp = this.now();
    // Read before the write: XP is paid the first time a stage is finished, so replaying a
    // lesson does not mint it again.
    const alreadyComplete =
      (
        this.database
          .prepare(
            "SELECT state FROM journey_progress WHERE user_id = ? AND journey_id = ? AND stage_id = ?",
          )
          .get(LOCAL_USER_ID, journeyId, input.stageId) as { state?: string } | undefined
      )?.state ?? "";
    const transaction = this.database.transaction(() => {
      this.database
        .prepare(
          "INSERT INTO journey_progress (user_id, journey_id, stage_id, state, interaction_state, updated_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(user_id, journey_id, stage_id) DO UPDATE SET state = excluded.state, interaction_state = excluded.interaction_state, updated_at = excluded.updated_at",
        )
        .run(
          LOCAL_USER_ID,
          journeyId,
          input.stageId,
          input.state,
          JSON.stringify(input.interactionState),
          timestamp,
        );
      if (input.state === "completed" || input.state === "skipped_optional") {
        const freshlyDone = alreadyComplete !== "completed" && alreadyComplete !== "skipped_optional";
        const award = stageType && input.state === "completed" ? stageCompletionXp(stageType) : 0;
        if (freshlyDone && award > 0) {
          this.database
            .prepare("UPDATE user_profiles SET xp = xp + ?, updated_at = ? WHERE id = ?")
            .run(award, timestamp, LOCAL_USER_ID);
        }
        const next = stageOrder[stageOrder.indexOf(input.stageId) + 1];
        if (next) {
          this.database
            .prepare(
              "INSERT INTO journey_progress (user_id, journey_id, stage_id, state, interaction_state, updated_at) VALUES (?, ?, ?, 'active', '{}', ?) ON CONFLICT(user_id, journey_id, stage_id) DO UPDATE SET state = CASE WHEN journey_progress.state IN ('completed', 'skipped_optional') THEN journey_progress.state ELSE 'active' END, updated_at = excluded.updated_at",
            )
            .run(LOCAL_USER_ID, journeyId, next, timestamp);
        }
      }
    });
    transaction();
    return this.getJourneyProgress(journeyId, stageOrder);
  }

  getEssayDraft(essayId: string): EssayDraftRow {
    const row = this.database
      .prepare(
        "SELECT essay_id AS essayId, content, submitted, updated_at AS updatedAt FROM essay_drafts WHERE user_id = ? AND essay_id = ?",
      )
      .get(LOCAL_USER_ID, essayId) as
      | { essayId: string; content: string; submitted: number; updatedAt: string | null }
      | undefined;
    if (!row) return { essayId, content: "", submitted: false, updatedAt: null };
    return {
      essayId: row.essayId,
      content: row.content,
      submitted: bool(row.submitted),
      updatedAt: row.updatedAt,
    };
  }

  saveEssayDraft(essayId: string, content: string): EssayDraftRow {
    const timestamp = this.now();
    this.database
      .prepare(
        "INSERT INTO essay_drafts (user_id, essay_id, content, submitted, updated_at) VALUES (?, ?, ?, 0, ?) ON CONFLICT(user_id, essay_id) DO UPDATE SET content = CASE WHEN essay_drafts.submitted = 1 THEN essay_drafts.content ELSE excluded.content END, updated_at = CASE WHEN essay_drafts.submitted = 1 THEN essay_drafts.updated_at ELSE excluded.updated_at END",
      )
      .run(LOCAL_USER_ID, essayId, content, timestamp);
    return this.getEssayDraft(essayId);
  }

  submitEssay(essayId: string, content: string): EssayDraftRow {
    const timestamp = this.now();
    this.database
      .prepare(
        "INSERT INTO essay_drafts (user_id, essay_id, content, submitted, updated_at) VALUES (?, ?, ?, 1, ?) ON CONFLICT(user_id, essay_id) DO UPDATE SET content = CASE WHEN essay_drafts.submitted = 1 THEN essay_drafts.content ELSE excluded.content END, submitted = 1, updated_at = CASE WHEN essay_drafts.submitted = 1 THEN essay_drafts.updated_at ELSE excluded.updated_at END",
      )
      .run(LOCAL_USER_ID, essayId, content, timestamp);
    return this.getEssayDraft(essayId);
  }

  getEssayAssessment(essayId: string): EssayAssessmentRow | null {
    const row = this.database
      .prepare(
        "SELECT essay_id AS essayId, request_id AS requestId, status, provider, accepted, assessment_json AS assessmentJson, issues_json AS issuesJson, error_code AS errorCode, error_message AS errorMessage, updated_at AS updatedAt FROM essay_assessments WHERE user_id = ? AND essay_id = ?",
      )
      .get(LOCAL_USER_ID, essayId) as
      | (Omit<EssayAssessmentRow, "accepted"> & { accepted: number })
      | undefined;
    if (!row) return null;
    return { ...row, accepted: bool(row.accepted) };
  }

  saveEssayAssessment(row: EssayAssessmentWrite): EssayAssessmentRow {
    const timestamp = this.now();
    this.database
      .prepare(
        "INSERT INTO essay_assessments (user_id, essay_id, request_id, status, provider, accepted, assessment_json, issues_json, error_code, error_message, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(user_id, essay_id) DO UPDATE SET request_id = excluded.request_id, status = excluded.status, provider = excluded.provider, accepted = excluded.accepted, assessment_json = excluded.assessment_json, issues_json = excluded.issues_json, error_code = excluded.error_code, error_message = excluded.error_message, updated_at = excluded.updated_at",
      )
      .run(
        LOCAL_USER_ID,
        row.essayId,
        row.requestId,
        row.status,
        row.provider,
        row.accepted ? 1 : 0,
        row.assessmentJson,
        row.issuesJson,
        row.errorCode,
        row.errorMessage,
        timestamp,
      );
    return this.getEssayAssessment(row.essayId) ?? { ...row, updatedAt: timestamp };
  }

  /** Records that a tutor answered inside an open attempt, alongside hints and reveals. */
  recordTutorAssistance(attemptId: string, detail: string): void {
    this.database
      .prepare(
        "INSERT INTO assistance_events (id, attempt_id, type, detail, created_at) VALUES (?, ?, 'tutor_reply', ?, ?)",
      )
      .run(randomUUID(), attemptId, detail, this.now());
  }

  ensureReviewCard(courseId: string, card: Flashcard, state: ReviewState): ReviewCardRow {
    this.database
      .prepare(
        "INSERT INTO review_cards (user_id, card_id, course_id, question_id, concept_ids, front, back, source_ids, due_at, interval_days, repetition, last_outcome, last_evidence, independent_reviews, assisted_reviews, last_reviewed_at, stability, difficulty, lapses, phase, learning_step, elapsed_days, scheduled_days) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(user_id, card_id) DO UPDATE SET course_id = excluded.course_id",
      )
      .run(
        LOCAL_USER_ID,
        card.id,
        courseId,
        card.questionId,
        JSON.stringify(card.conceptIds),
        card.front,
        card.back,
        JSON.stringify(card.sourceIds),
        state.dueAt,
        state.intervalDays,
        state.repetition,
        state.lastOutcome,
        state.lastEvidence,
        state.independentReviews,
        state.assistedReviews,
        state.lastReviewedAt,
        state.stability,
        state.difficulty,
        state.lapses,
        state.phase,
        state.learningStep,
        state.elapsedDays,
        state.scheduledDays,
      );
    return this.getReviewCard(card.id) ?? { card, state, courseId };
  }

  getReviewCard(cardId: string): ReviewCardRow | null {
    const row = this.database
      .prepare(
        "SELECT card_id AS cardId, course_id AS courseId, question_id AS questionId, concept_ids AS conceptIds, front, back, source_ids AS sourceIds, due_at AS dueAt, interval_days AS intervalDays, repetition, last_outcome AS lastOutcome, last_evidence AS lastEvidence, independent_reviews AS independentReviews, assisted_reviews AS assistedReviews, last_reviewed_at AS lastReviewedAt, stability, difficulty, lapses, phase, learning_step AS learningStep, elapsed_days AS elapsedDays, scheduled_days AS scheduledDays FROM review_cards WHERE user_id = ? AND card_id = ?",
      )
      .get(LOCAL_USER_ID, cardId) as
      | {
          cardId: string;
          courseId: string;
          questionId: string;
          conceptIds: string;
          front: string;
          back: string;
          sourceIds: string;
          dueAt: string;
          intervalDays: number;
          repetition: number;
          lastOutcome: ReviewOutcome | null;
          lastEvidence: ReviewEvidence | null;
          independentReviews: number;
          assistedReviews: number;
          lastReviewedAt: string | null;
          stability: number;
          difficulty: number;
          lapses: number;
          phase: string;
          learningStep: number;
          elapsedDays: number;
          scheduledDays: number;
        }
      | undefined;
    if (!row) return null;
    const parseArray = (value: unknown): string[] => {
      try {
        return JSON.parse(String(value)) as string[];
      } catch {
        return [];
      }
    };
    const state: ReviewState = {
      cardId: String(row.cardId),
      dueAt: String(row.dueAt),
      intervalDays: Number(row.intervalDays),
      repetition: Number(row.repetition),
      lastOutcome: (row.lastOutcome as ReviewOutcome | null) ?? null,
      lastEvidence: (row.lastEvidence as ReviewEvidence | null) ?? null,
      independentReviews: Number(row.independentReviews),
      assistedReviews: Number(row.assistedReviews),
      lastReviewedAt: row.lastReviewedAt ? String(row.lastReviewedAt) : null,
      stability: Number(row.stability),
      difficulty: Number(row.difficulty),
      lapses: Number(row.lapses),
      phase: REVIEW_PHASES.has(row.phase as ReviewPhase) ? (row.phase as ReviewPhase) : "new",
      learningStep: Number(row.learningStep),
      elapsedDays: Number(row.elapsedDays),
      scheduledDays: Number(row.scheduledDays),
    };
    return {
      courseId: String(row.courseId),
      card: {
        id: String(row.cardId),
        questionId: String(row.questionId),
        conceptIds: parseArray(row.conceptIds),
        front: String(row.front),
        back: String(row.back),
        sourceIds: parseArray(row.sourceIds),
        reviewedAt: state.lastReviewedAt ?? state.dueAt,
      },
      state,
    };
  }

  /** How recently each course was studied, over every card rather than only the due ones. */
  private courseReviewRecency(): Map<string, string | null> {
    const rows = this.database
      .prepare(
        "SELECT course_id AS courseId, MAX(last_reviewed_at) AS lastReviewedAt FROM review_cards WHERE user_id = ? GROUP BY course_id",
      )
      .all(LOCAL_USER_ID) as Array<{ courseId: string; lastReviewedAt: string | null }>;
    return new Map(rows.map((row) => [row.courseId, row.lastReviewedAt]));
  }

  /** Every due card, in the order the learner should meet them: courses take turns. */
  dueReviewQueue(nowTimestamp: string): CourseQueueEntry[] {
    const rows = this.database
      .prepare(
        "SELECT card_id AS cardId, course_id AS courseId, due_at AS dueAt, repetition, rowid AS sequence FROM review_cards WHERE user_id = ? AND due_at <= ?",
      )
      .all(LOCAL_USER_ID, nowTimestamp) as CourseQueueEntry[];
    return interleaveByCourse(rows, this.courseReviewRecency());
  }

  getDueReviewCard(nowTimestamp: string): ReviewCardRow | null {
    const next = this.dueReviewQueue(nowTimestamp)[0];
    return next ? this.getReviewCard(next.cardId) : null;
  }

  countDueReviewCards(nowTimestamp: string): number {
    const row = this.database
      .prepare("SELECT COUNT(*) AS count FROM review_cards WHERE user_id = ? AND due_at <= ?")
      .get(LOCAL_USER_ID, nowTimestamp) as { count: number };
    return row.count;
  }

  /** Due and total card counts per course, so the review screen can name where the work is. */
  countDueReviewCardsByCourse(nowTimestamp: string): CourseDueCount[] {
    return this.database
      .prepare(
        "SELECT course_id AS courseId, SUM(CASE WHEN due_at <= ? THEN 1 ELSE 0 END) AS dueCount, COUNT(*) AS cardCount, MIN(due_at) AS nextDueAt FROM review_cards WHERE user_id = ? GROUP BY course_id ORDER BY course_id",
      )
      .all(nowTimestamp, LOCAL_USER_ID) as CourseDueCount[];
  }

  createReviewSession(cardId: string): ReviewSessionRow {
    if (!this.getReviewCard(cardId)) throw new Error(`Review card '${cardId}' was not found.`);
    const session: ReviewSessionRow = {
      id: randomUUID(),
      cardId,
      revealed: false,
      rated: false,
      createdAt: this.now(),
    };
    this.database
      .prepare(
        "INSERT INTO review_sessions (id, user_id, card_id, revealed, rated, created_at) VALUES (?, ?, ?, 0, 0, ?)",
      )
      .run(session.id, LOCAL_USER_ID, session.cardId, session.createdAt);
    return session;
  }

  getReviewSession(sessionId: string): ReviewSessionRow | null {
    const row = this.database
      .prepare(
        "SELECT id, card_id AS cardId, revealed, rated, created_at AS createdAt FROM review_sessions WHERE user_id = ? AND id = ?",
      )
      .get(LOCAL_USER_ID, sessionId) as
      | { id: string; cardId: string; revealed: number; rated: number; createdAt: string }
      | undefined;
    return row
      ? {
          id: row.id,
          cardId: row.cardId,
          revealed: bool(row.revealed),
          rated: bool(row.rated),
          createdAt: row.createdAt,
        }
      : null;
  }

  revealReviewSession(sessionId: string): ReviewCardRow | null {
    const session = this.getReviewSession(sessionId);
    if (!session || session.rated) return null;
    this.database
      .prepare("UPDATE review_sessions SET revealed = 1 WHERE id = ? AND user_id = ?")
      .run(sessionId, LOCAL_USER_ID);
    return this.getReviewCard(session.cardId);
  }

  rateReviewSession(
    sessionId: string,
    rating: ReviewRating,
    recalled: boolean,
  ): { state: ReviewState; evidence: ReviewEvidence } | null {
    const session = this.getReviewSession(sessionId);
    if (!session || session.rated || !session.revealed) return null;
    const card = this.getReviewCard(session.cardId);
    if (!card) return null;
    const outcome: ReviewOutcome = rating === "again" ? "incorrect" : "correct";
    const evidence: ReviewEvidence = recalled ? "independent" : "assisted";
    // The learner's own rating reaches FSRS; assisted recall is capped inside the engine.
    const next = scheduleReview(card.state, {
      outcome,
      evidence,
      rating,
      reviewedAt: this.now(),
    });
    const updated = this.database.transaction(() => {
      this.database
        .prepare(
          "UPDATE review_cards SET due_at = ?, interval_days = ?, repetition = ?, last_outcome = ?, last_evidence = ?, independent_reviews = ?, assisted_reviews = ?, last_reviewed_at = ?, stability = ?, difficulty = ?, lapses = ?, phase = ?, learning_step = ?, elapsed_days = ?, scheduled_days = ? WHERE user_id = ? AND card_id = ?",
        )
        .run(
          next.dueAt,
          next.intervalDays,
          next.repetition,
          next.lastOutcome,
          next.lastEvidence,
          next.independentReviews,
          next.assistedReviews,
          next.lastReviewedAt,
          next.stability,
          next.difficulty,
          next.lapses,
          next.phase,
          next.learningStep,
          next.elapsedDays,
          next.scheduledDays,
          LOCAL_USER_ID,
          session.cardId,
        );
      this.database
        .prepare("UPDATE review_sessions SET rated = 1 WHERE id = ? AND user_id = ?")
        .run(sessionId, LOCAL_USER_ID);
      return { state: next, evidence };
    });
    return updated();
  }

  getAttempt(id: string): AttemptRow | null {
    interface AttemptSqlRow {
      id: string;
      userId: string;
      questionId: string;
      response: string;
      mode: string;
      correct: number;
      feedback: string;
      hintCount: number;
      answerRevealed: number;
      xpAwarded: number;
      mastery: number;
      createdAt: string;
      updatedAt: string;
    }
    const row = this.database
      .prepare(
        "SELECT id, user_id AS userId, question_id AS questionId, response, mode, correct, feedback, hint_count AS hintCount, answer_revealed AS answerRevealed, xp_awarded AS xpAwarded, mastery, created_at AS createdAt, updated_at AS updatedAt FROM attempts WHERE id = ?",
      )
      .get(id) as AttemptSqlRow | undefined;
    if (!row) return null;
    return {
      id: row.id,
      userId: row.userId,
      questionId: row.questionId,
      response: row.response,
      mode: row.mode as TutoringMode,
      correct: bool(row.correct),
      feedback: row.feedback,
      hintCount: row.hintCount,
      answerRevealed: bool(row.answerRevealed),
      xpAwarded: row.xpAwarded,
      mastery: row.mastery,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  saveAttempt(input: AttemptWrite): AttemptRow {
    const id = input.id ?? randomUUID();
    const previous = input.id ? this.getAttempt(input.id) : null;
    const timestamp = this.now();
    const xpDelta = Math.max(0, input.xpAwarded - (previous?.xpAwarded ?? 0));
    const transaction = this.database.transaction(() => {
      if (previous) {
        this.database
          .prepare(
            "UPDATE attempts SET response = ?, mode = ?, correct = ?, feedback = ?, xp_awarded = ?, mastery = ?, updated_at = ? WHERE id = ?",
          )
          .run(
            input.response,
            input.mode,
            input.correct ? 1 : 0,
            input.feedback,
            Math.max(previous.xpAwarded, input.xpAwarded),
            input.mastery,
            timestamp,
            id,
          );
      } else {
        this.database
          .prepare(
            "INSERT INTO attempts (id, user_id, question_id, response, mode, correct, feedback, hint_count, answer_revealed, xp_awarded, mastery, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?, ?)",
          )
          .run(
            id,
            LOCAL_USER_ID,
            input.questionId,
            input.response,
            input.mode,
            input.correct ? 1 : 0,
            input.feedback,
            input.xpAwarded,
            input.mastery,
            timestamp,
            timestamp,
          );
      }
      if (xpDelta > 0)
        this.database
          .prepare("UPDATE user_profiles SET xp = xp + ?, updated_at = ? WHERE id = ?")
          .run(xpDelta, timestamp, LOCAL_USER_ID);
      if (input.correct && !previous?.correct) {
        for (const conceptId of input.conceptIds) {
          const mastery = input.conceptMastery[conceptId];
          if (mastery === undefined)
            throw new Error(`Missing mastery value for concept '${conceptId}'.`);
          this.database
            .prepare(
              `UPDATE concept_progress SET mastery = ?, state = CASE WHEN ? >= 0.85 THEN 'mastered' WHEN ? >= 0.55 THEN 'practised' ELSE 'discovered' END, independent_attempts = independent_attempts + ?, assisted_attempts = assisted_attempts + ?, updated_at = ? WHERE user_id = ? AND concept_id = ?`,
            )
            .run(
              mastery,
              mastery,
              mastery,
              input.independent ? 1 : 0,
              input.independent ? 0 : 1,
              timestamp,
              LOCAL_USER_ID,
              conceptId,
            );
        }
      }
    });
    transaction();
    const saved = this.getAttempt(id);
    if (!saved) throw new Error("Attempt could not be saved.");
    return saved;
  }

  recordHint(attemptId: string, detail: string): number {
    const attempt = this.getAttempt(attemptId);
    if (!attempt) throw new Error("Attempt not found.");
    const next = attempt.hintCount + 1;
    const timestamp = this.now();
    const transaction = this.database.transaction(() => {
      this.database
        .prepare("UPDATE attempts SET hint_count = ?, updated_at = ? WHERE id = ?")
        .run(next, timestamp, attemptId);
      this.database
        .prepare(
          "INSERT INTO assistance_events (id, attempt_id, type, detail, created_at) VALUES (?, ?, 'hint', ?, ?)",
        )
        .run(randomUUID(), attemptId, detail, timestamp);
    });
    transaction();
    return next;
  }

  createReveal(attemptId: string, reason: string, availableAt: string): RevealRow {
    const token = randomUUID();
    const createdAt = this.now();
    this.database
      .prepare(
        "INSERT INTO reveal_sessions (token, attempt_id, reason, available_at, used_at, created_at) VALUES (?, ?, ?, ?, NULL, ?)",
      )
      .run(token, attemptId, reason, availableAt, createdAt);
    return { token, attemptId, reason, availableAt, usedAt: null, createdAt };
  }

  getReveal(token: string): RevealRow | null {
    const row = this.database
      .prepare(
        "SELECT token, attempt_id AS attemptId, reason, available_at AS availableAt, used_at AS usedAt, created_at AS createdAt FROM reveal_sessions WHERE token = ?",
      )
      .get(token) as RevealRow | undefined;
    return row ?? null;
  }

  consumeReveal(token: string): boolean {
    const reveal = this.getReveal(token);
    if (!reveal) return false;
    const timestamp = this.now();
    const transaction = this.database.transaction(() => {
      const consumed = this.database
        .prepare("UPDATE reveal_sessions SET used_at = ? WHERE token = ? AND used_at IS NULL")
        .run(timestamp, token);
      if (consumed.changes !== 1) return false;
      this.database
        .prepare("UPDATE attempts SET answer_revealed = 1, updated_at = ? WHERE id = ?")
        .run(timestamp, reveal.attemptId);
      this.database
        .prepare(
          "INSERT INTO assistance_events (id, attempt_id, type, detail, created_at) VALUES (?, ?, 'answer_reveal', ?, ?)",
        )
        .run(randomUUID(), reveal.attemptId, reveal.reason, timestamp);
      return true;
    });
    return transaction();
  }

  recordWritingGate(context: string, text: string, result: WritingLintResponse): void {
    const hash = createHash("sha256").update(text).digest("hex");
    this.database
      .prepare(
        "INSERT INTO writing_gate_runs (id, context, passed, text_hash, violation_count, created_at) VALUES (?, ?, ?, ?, ?, ?)",
      )
      .run(randomUUID(), context, result.passed ? 1 : 0, hash, result.violations.length, this.now());
  }

  close(): void {
    this.database.close();
  }
}
