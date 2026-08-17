import { createHash, randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import type { Concept, ConceptProgress, ConceptState, JourneyProgress, StageProgressRequest, StageState, TutoringMode, WritingLintResponse } from "@discere/contracts";
import { scheduleReview, type Flashcard, type ReviewEvidence, type ReviewOutcome, type ReviewState } from "@discere/progression-engine";

const LOCAL_USER_ID = "local-user";

export interface AttemptRow {
  id: string; userId: string; questionId: string; response: string; mode: TutoringMode; correct: boolean; feedback: string; hintCount: number; answerRevealed: boolean; xpAwarded: number; mastery: number; createdAt: string; updatedAt: string;
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
export interface RevealRow { token: string; attemptId: string; reason: string; availableAt: string; usedAt: string | null; createdAt: string; }
export interface EssayDraftRow { essayId: string; content: string; submitted: boolean; updatedAt: string | null; }
export interface ReviewCardRow { card: Flashcard; state: ReviewState; }
export interface ReviewSessionRow { id: string; cardId: string; revealed: boolean; rated: boolean; createdAt: string; }

function now(): string { return new Date().toISOString(); }
function bool(value: unknown): boolean { return value === 1 || value === true; }

export class DiscereStore {
  readonly database: Database.Database;
  constructor(databasePath: string) {
    if (databasePath !== ":memory:") mkdirSync(path.dirname(databasePath), { recursive: true });
    this.database = new Database(databasePath);
    this.database.pragma("journal_mode = WAL");
    this.database.pragma("foreign_keys = ON");
    this.migrate();
    this.ensureUser();
  }

  private migrate(): void {
    this.database.exec(`
      CREATE TABLE IF NOT EXISTS user_profiles (id TEXT PRIMARY KEY, learner_name TEXT NOT NULL, xp INTEGER NOT NULL DEFAULT 0, streak_days INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS concept_progress (user_id TEXT NOT NULL, concept_id TEXT NOT NULL, state TEXT NOT NULL, mastery REAL NOT NULL DEFAULT 0, independent_attempts INTEGER NOT NULL DEFAULT 0, assisted_attempts INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL, PRIMARY KEY (user_id, concept_id));
      CREATE TABLE IF NOT EXISTS attempts (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, question_id TEXT NOT NULL, response TEXT NOT NULL, mode TEXT NOT NULL, correct INTEGER NOT NULL, feedback TEXT NOT NULL, hint_count INTEGER NOT NULL DEFAULT 0, answer_revealed INTEGER NOT NULL DEFAULT 0, xp_awarded INTEGER NOT NULL DEFAULT 0, mastery REAL NOT NULL DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS assistance_events (id TEXT PRIMARY KEY, attempt_id TEXT NOT NULL, type TEXT NOT NULL, detail TEXT, created_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS reveal_sessions (token TEXT PRIMARY KEY, attempt_id TEXT NOT NULL, reason TEXT NOT NULL, available_at TEXT NOT NULL, used_at TEXT, created_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS writing_gate_runs (id TEXT PRIMARY KEY, context TEXT NOT NULL, passed INTEGER NOT NULL, text_hash TEXT NOT NULL, violation_count INTEGER NOT NULL, created_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS journey_progress (user_id TEXT NOT NULL, journey_id TEXT NOT NULL, stage_id TEXT NOT NULL, state TEXT NOT NULL, interaction_state TEXT NOT NULL DEFAULT '{}', updated_at TEXT NOT NULL, PRIMARY KEY (user_id, journey_id, stage_id));
      CREATE TABLE IF NOT EXISTS essay_drafts (user_id TEXT NOT NULL, essay_id TEXT NOT NULL, content TEXT NOT NULL DEFAULT '', submitted INTEGER NOT NULL DEFAULT 0, updated_at TEXT, PRIMARY KEY (user_id, essay_id));
      CREATE TABLE IF NOT EXISTS review_cards (user_id TEXT NOT NULL, card_id TEXT NOT NULL, question_id TEXT NOT NULL, concept_ids TEXT NOT NULL, front TEXT NOT NULL, back TEXT NOT NULL, source_ids TEXT NOT NULL, due_at TEXT NOT NULL, interval_days REAL NOT NULL, repetition INTEGER NOT NULL, last_outcome TEXT, last_evidence TEXT, independent_reviews INTEGER NOT NULL DEFAULT 0, assisted_reviews INTEGER NOT NULL DEFAULT 0, last_reviewed_at TEXT, PRIMARY KEY (user_id, card_id));
      CREATE TABLE IF NOT EXISTS review_sessions (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, card_id TEXT NOT NULL, revealed INTEGER NOT NULL DEFAULT 0, rated INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS idx_attempts_question ON attempts(question_id);
      CREATE INDEX IF NOT EXISTS idx_assistance_attempt ON assistance_events(attempt_id);
      CREATE INDEX IF NOT EXISTS idx_journey_progress ON journey_progress(user_id, journey_id);
    `);
  }

  private ensureUser(): void {
    const timestamp = now();
    const learnerName = process.env["DISCERE_LEARNER_NAME"]?.trim() || "Learner";
    this.database
      .prepare(
        "INSERT OR IGNORE INTO user_profiles (id, learner_name, xp, streak_days, created_at, updated_at) VALUES (?, ?, 0, 0, ?, ?)",
      )
      .run(LOCAL_USER_ID, learnerName, timestamp, timestamp);
  }

  initialiseConcepts(concepts: Concept[]): void {
    const statement = this.database.prepare("INSERT OR IGNORE INTO concept_progress (user_id, concept_id, state, mastery, independent_attempts, assisted_attempts, updated_at) VALUES (?, ?, ?, 0, 0, 0, ?)");
    const transaction = this.database.transaction(() => {
      concepts.forEach((concept, index) => {
        statement.run(LOCAL_USER_ID, concept.id, index === 0 ? "available" : "locked", now());
      });
    });
    transaction();
  }

  getProfile(): { learnerName: string; xp: number; streakDays: number } {
    const row = this.database.prepare("SELECT learner_name AS learnerName, xp, streak_days AS streakDays FROM user_profiles WHERE id = ?").get(LOCAL_USER_ID) as { learnerName: string; xp: number; streakDays: number } | undefined;
    if (!row) throw new Error("Local learner profile is missing.");
    return row;
  }

  getProgress(): ConceptProgress[] {
    return (this.database.prepare("SELECT concept_id AS conceptId, state, mastery, independent_attempts AS independentAttempts, assisted_attempts AS assistedAttempts FROM concept_progress WHERE user_id = ? ORDER BY rowid").all(LOCAL_USER_ID) as Array<{ conceptId: string; state: ConceptState; mastery: number; independentAttempts: number; assistedAttempts: number }>).map((row) => ({ ...row }));
  }

  getMastery(conceptId: string): number {
    const row = this.database.prepare("SELECT mastery FROM concept_progress WHERE user_id = ? AND concept_id = ?").get(LOCAL_USER_ID, conceptId) as { mastery: number } | undefined;
    return row?.mastery ?? 0;
  }

  getJourneyProgress(journeyId: string, stageOrder: string[]): JourneyProgress {
    const rows = this.database.prepare("SELECT stage_id AS stageId, state, interaction_state AS interactionState, updated_at AS updatedAt FROM journey_progress WHERE user_id = ? AND journey_id = ?").all(LOCAL_USER_ID, journeyId) as Array<{ stageId: string; state: StageState; interactionState: string; updatedAt: string }>;
    const byId = new Map(rows.map((row) => {
      let interactionState: Record<string, unknown> = {};
      try { interactionState = JSON.parse(row.interactionState) as Record<string, unknown>; } catch { interactionState = {}; }
      return [row.stageId, { stageId: row.stageId, state: row.state, interactionState, updatedAt: row.updatedAt }];
    }));
    let previousComplete = true;
    const stages = stageOrder.map((stageId) => {
      const saved = byId.get(stageId);
      if (saved) {
        previousComplete = saved.state === "completed" || saved.state === "skipped_optional";
        return saved;
      }
      const state: StageState = previousComplete ? "available" : "locked";
      previousComplete = false;
      return { stageId, state, interactionState: {}, updatedAt: now() };
    });
    const active = stages.find((stage) => stage.state === "active") ?? stages.find((stage) => stage.state === "available") ?? stages[stages.length - 1];
    return { journeyId, activeStageId: active?.stageId ?? stageOrder[0] ?? "", stages };
  }

  saveStageProgress(journeyId: string, stageOrder: string[], input: StageProgressRequest): JourneyProgress {
    if (!stageOrder.includes(input.stageId)) throw new Error(`Stage '${input.stageId}' is not part of journey '${journeyId}'.`);
    const timestamp = now();
    const transaction = this.database.transaction(() => {
      this.database.prepare("INSERT INTO journey_progress (user_id, journey_id, stage_id, state, interaction_state, updated_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(user_id, journey_id, stage_id) DO UPDATE SET state = excluded.state, interaction_state = excluded.interaction_state, updated_at = excluded.updated_at").run(LOCAL_USER_ID, journeyId, input.stageId, input.state, JSON.stringify(input.interactionState), timestamp);
      if (input.state === "completed" || input.state === "skipped_optional") {
        const next = stageOrder[stageOrder.indexOf(input.stageId) + 1];
        if (next) {
          this.database.prepare("INSERT INTO journey_progress (user_id, journey_id, stage_id, state, interaction_state, updated_at) VALUES (?, ?, ?, 'active', '{}', ?) ON CONFLICT(user_id, journey_id, stage_id) DO UPDATE SET state = CASE WHEN journey_progress.state IN ('completed', 'skipped_optional') THEN journey_progress.state ELSE 'active' END, updated_at = excluded.updated_at").run(LOCAL_USER_ID, journeyId, next, timestamp);
        }
      }
    });
    transaction();
    return this.getJourneyProgress(journeyId, stageOrder);
  }

  getEssayDraft(essayId: string): EssayDraftRow {
    const row = this.database.prepare("SELECT essay_id AS essayId, content, submitted, updated_at AS updatedAt FROM essay_drafts WHERE user_id = ? AND essay_id = ?").get(LOCAL_USER_ID, essayId) as { essayId: string; content: string; submitted: number; updatedAt: string | null } | undefined;
    if (!row) return { essayId, content: "", submitted: false, updatedAt: null };
    return { essayId: row.essayId, content: row.content, submitted: bool(row.submitted), updatedAt: row.updatedAt };
  }

  saveEssayDraft(essayId: string, content: string): EssayDraftRow {
    const timestamp = now();
    this.database.prepare("INSERT INTO essay_drafts (user_id, essay_id, content, submitted, updated_at) VALUES (?, ?, ?, 0, ?) ON CONFLICT(user_id, essay_id) DO UPDATE SET content = CASE WHEN essay_drafts.submitted = 1 THEN essay_drafts.content ELSE excluded.content END, updated_at = CASE WHEN essay_drafts.submitted = 1 THEN essay_drafts.updated_at ELSE excluded.updated_at END").run(LOCAL_USER_ID, essayId, content, timestamp);
    return this.getEssayDraft(essayId);
  }

  submitEssay(essayId: string, content: string): EssayDraftRow {
    const timestamp = now();
    this.database.prepare("INSERT INTO essay_drafts (user_id, essay_id, content, submitted, updated_at) VALUES (?, ?, ?, 1, ?) ON CONFLICT(user_id, essay_id) DO UPDATE SET content = CASE WHEN essay_drafts.submitted = 1 THEN essay_drafts.content ELSE excluded.content END, submitted = 1, updated_at = CASE WHEN essay_drafts.submitted = 1 THEN essay_drafts.updated_at ELSE excluded.updated_at END").run(LOCAL_USER_ID, essayId, content, timestamp);
    return this.getEssayDraft(essayId);
  }

  ensureReviewCard(card: Flashcard, state: ReviewState): ReviewCardRow {
    this.database.prepare("INSERT OR IGNORE INTO review_cards (user_id, card_id, question_id, concept_ids, front, back, source_ids, due_at, interval_days, repetition, last_outcome, last_evidence, independent_reviews, assisted_reviews, last_reviewed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(LOCAL_USER_ID, card.id, card.questionId, JSON.stringify(card.conceptIds), card.front, card.back, JSON.stringify(card.sourceIds), state.dueAt, state.intervalDays, state.repetition, state.lastOutcome, state.lastEvidence, state.independentReviews, state.assistedReviews, state.lastReviewedAt);
    return this.getReviewCard(card.id) ?? { card, state };
  }

  getReviewCard(cardId: string): ReviewCardRow | null {
    const row = this.database.prepare("SELECT card_id AS cardId, question_id AS questionId, concept_ids AS conceptIds, front, back, source_ids AS sourceIds, due_at AS dueAt, interval_days AS intervalDays, repetition, last_outcome AS lastOutcome, last_evidence AS lastEvidence, independent_reviews AS independentReviews, assisted_reviews AS assistedReviews, last_reviewed_at AS lastReviewedAt FROM review_cards WHERE user_id = ? AND card_id = ?").get(LOCAL_USER_ID, cardId) as {
      cardId: string;
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
    } | undefined;
    if (!row) return null;
    const parseArray = (value: unknown): string[] => { try { return JSON.parse(String(value)) as string[]; } catch { return []; } };
    const state: ReviewState = { cardId: String(row.cardId), dueAt: String(row.dueAt), intervalDays: Number(row.intervalDays), repetition: Number(row.repetition), lastOutcome: (row.lastOutcome as ReviewOutcome | null) ?? null, lastEvidence: (row.lastEvidence as ReviewEvidence | null) ?? null, independentReviews: Number(row.independentReviews), assistedReviews: Number(row.assistedReviews), lastReviewedAt: row.lastReviewedAt ? String(row.lastReviewedAt) : null };
    return { card: { id: String(row.cardId), questionId: String(row.questionId), conceptIds: parseArray(row.conceptIds), front: String(row.front), back: String(row.back), sourceIds: parseArray(row.sourceIds), reviewedAt: state.lastReviewedAt ?? state.dueAt }, state };
  }

  getDueReviewCard(nowTimestamp: string): ReviewCardRow | null {
    const row = this.database.prepare("SELECT card_id AS cardId FROM review_cards WHERE user_id = ? AND due_at <= ? ORDER BY due_at, repetition, card_id LIMIT 1").get(LOCAL_USER_ID, nowTimestamp) as { cardId: string } | undefined;
    return row ? this.getReviewCard(row.cardId) : null;
  }

  countDueReviewCards(nowTimestamp: string): number {
    const row = this.database.prepare("SELECT COUNT(*) AS count FROM review_cards WHERE user_id = ? AND due_at <= ?").get(LOCAL_USER_ID, nowTimestamp) as { count: number };
    return row.count;
  }

  createReviewSession(cardId: string): ReviewSessionRow {
    if (!this.getReviewCard(cardId)) throw new Error(`Review card '${cardId}' was not found.`);
    const session: ReviewSessionRow = { id: randomUUID(), cardId, revealed: false, rated: false, createdAt: now() };
    this.database.prepare("INSERT INTO review_sessions (id, user_id, card_id, revealed, rated, created_at) VALUES (?, ?, ?, 0, 0, ?)").run(session.id, LOCAL_USER_ID, session.cardId, session.createdAt);
    return session;
  }

  getReviewSession(sessionId: string): ReviewSessionRow | null {
    const row = this.database.prepare("SELECT id, card_id AS cardId, revealed, rated, created_at AS createdAt FROM review_sessions WHERE user_id = ? AND id = ?").get(LOCAL_USER_ID, sessionId) as { id: string; cardId: string; revealed: number; rated: number; createdAt: string } | undefined;
    return row ? { id: row.id, cardId: row.cardId, revealed: bool(row.revealed), rated: bool(row.rated), createdAt: row.createdAt } : null;
  }

  revealReviewSession(sessionId: string): ReviewCardRow | null {
    const session = this.getReviewSession(sessionId);
    if (!session || session.rated) return null;
    this.database.prepare("UPDATE review_sessions SET revealed = 1 WHERE id = ? AND user_id = ?").run(sessionId, LOCAL_USER_ID);
    return this.getReviewCard(session.cardId);
  }

  rateReviewSession(sessionId: string, rating: "again" | "hard" | "good" | "easy", recalled: boolean): { state: ReviewState; evidence: ReviewEvidence } | null {
    const session = this.getReviewSession(sessionId);
    if (!session || session.rated || !session.revealed) return null;
    const card = this.getReviewCard(session.cardId);
    if (!card) return null;
    const outcome: ReviewOutcome = rating === "again" ? "incorrect" : "correct";
    const evidence: ReviewEvidence = recalled ? "independent" : "assisted";
    const next = scheduleReview(card.state, { outcome, evidence, reviewedAt: now() });
    const updated = this.database.transaction(() => {
      this.database.prepare("UPDATE review_cards SET due_at = ?, interval_days = ?, repetition = ?, last_outcome = ?, last_evidence = ?, independent_reviews = ?, assisted_reviews = ?, last_reviewed_at = ? WHERE user_id = ? AND card_id = ?").run(next.dueAt, next.intervalDays, next.repetition, next.lastOutcome, next.lastEvidence, next.independentReviews, next.assistedReviews, next.lastReviewedAt, LOCAL_USER_ID, session.cardId);
      this.database.prepare("UPDATE review_sessions SET rated = 1 WHERE id = ? AND user_id = ?").run(sessionId, LOCAL_USER_ID);
      return { state: next, evidence };
    });
    return updated();
  }

  getAttempt(id: string): AttemptRow | null {
    interface AttemptSqlRow { id: string; userId: string; questionId: string; response: string; mode: string; correct: number; feedback: string; hintCount: number; answerRevealed: number; xpAwarded: number; mastery: number; createdAt: string; updatedAt: string; }
    const row = this.database.prepare("SELECT id, user_id AS userId, question_id AS questionId, response, mode, correct, feedback, hint_count AS hintCount, answer_revealed AS answerRevealed, xp_awarded AS xpAwarded, mastery, created_at AS createdAt, updated_at AS updatedAt FROM attempts WHERE id = ?").get(id) as AttemptSqlRow | undefined;
    if (!row) return null;
    return { id: row.id, userId: row.userId, questionId: row.questionId, response: row.response, mode: row.mode as TutoringMode, correct: bool(row.correct), feedback: row.feedback, hintCount: row.hintCount, answerRevealed: bool(row.answerRevealed), xpAwarded: row.xpAwarded, mastery: row.mastery, createdAt: row.createdAt, updatedAt: row.updatedAt };
  }

  saveAttempt(input: AttemptWrite): AttemptRow {
    const id = input.id ?? randomUUID();
    const previous = input.id ? this.getAttempt(input.id) : null;
    const timestamp = now();
    const xpDelta = Math.max(0, input.xpAwarded - (previous?.xpAwarded ?? 0));
    const transaction = this.database.transaction(() => {
      if (previous) {
        this.database.prepare("UPDATE attempts SET response = ?, mode = ?, correct = ?, feedback = ?, xp_awarded = ?, mastery = ?, updated_at = ? WHERE id = ?").run(input.response, input.mode, input.correct ? 1 : 0, input.feedback, Math.max(previous.xpAwarded, input.xpAwarded), input.mastery, timestamp, id);
      } else {
        this.database.prepare("INSERT INTO attempts (id, user_id, question_id, response, mode, correct, feedback, hint_count, answer_revealed, xp_awarded, mastery, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?, ?)").run(id, LOCAL_USER_ID, input.questionId, input.response, input.mode, input.correct ? 1 : 0, input.feedback, input.xpAwarded, input.mastery, timestamp, timestamp);
      }
      if (xpDelta > 0) this.database.prepare("UPDATE user_profiles SET xp = xp + ?, updated_at = ? WHERE id = ?").run(xpDelta, timestamp, LOCAL_USER_ID);
      if (input.correct && !previous?.correct) {
        for (const conceptId of input.conceptIds) {
          const mastery = input.conceptMastery[conceptId];
          if (mastery === undefined) throw new Error(`Missing mastery value for concept '${conceptId}'.`);
          this.database.prepare(`UPDATE concept_progress SET mastery = ?, state = CASE WHEN ? >= 0.85 THEN 'mastered' WHEN ? >= 0.55 THEN 'practised' ELSE 'discovered' END, independent_attempts = independent_attempts + ?, assisted_attempts = assisted_attempts + ?, updated_at = ? WHERE user_id = ? AND concept_id = ?`).run(mastery, mastery, mastery, input.independent ? 1 : 0, input.independent ? 0 : 1, timestamp, LOCAL_USER_ID, conceptId);
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
    const timestamp = now();
    const transaction = this.database.transaction(() => {
      this.database.prepare("UPDATE attempts SET hint_count = ?, updated_at = ? WHERE id = ?").run(next, timestamp, attemptId);
      this.database.prepare("INSERT INTO assistance_events (id, attempt_id, type, detail, created_at) VALUES (?, ?, 'hint', ?, ?)").run(randomUUID(), attemptId, detail, timestamp);
    });
    transaction();
    return next;
  }

  createReveal(attemptId: string, reason: string, availableAt: string): RevealRow {
    const token = randomUUID();
    const createdAt = now();
    this.database.prepare("INSERT INTO reveal_sessions (token, attempt_id, reason, available_at, used_at, created_at) VALUES (?, ?, ?, ?, NULL, ?)").run(token, attemptId, reason, availableAt, createdAt);
    return { token, attemptId, reason, availableAt, usedAt: null, createdAt };
  }

  getReveal(token: string): RevealRow | null {
    const row = this.database.prepare("SELECT token, attempt_id AS attemptId, reason, available_at AS availableAt, used_at AS usedAt, created_at AS createdAt FROM reveal_sessions WHERE token = ?").get(token) as RevealRow | undefined;
    return row ?? null;
  }

  consumeReveal(token: string): boolean {
    const reveal = this.getReveal(token);
    if (!reveal) return false;
    const timestamp = now();
    const transaction = this.database.transaction(() => {
      const consumed = this.database.prepare("UPDATE reveal_sessions SET used_at = ? WHERE token = ? AND used_at IS NULL").run(timestamp, token);
      if (consumed.changes !== 1) return false;
      this.database.prepare("UPDATE attempts SET answer_revealed = 1, updated_at = ? WHERE id = ?").run(timestamp, reveal.attemptId);
      this.database.prepare("INSERT INTO assistance_events (id, attempt_id, type, detail, created_at) VALUES (?, ?, 'answer_reveal', ?, ?)").run(randomUUID(), reveal.attemptId, reveal.reason, timestamp);
      return true;
    });
    return transaction();
  }

  recordWritingGate(context: string, text: string, result: WritingLintResponse): void {
    const hash = createHash("sha256").update(text).digest("hex");
    this.database.prepare("INSERT INTO writing_gate_runs (id, context, passed, text_hash, violation_count, created_at) VALUES (?, ?, ?, ?, ?, ?)").run(randomUUID(), context, result.passed ? 1 : 0, hash, result.violations.length, now());
  }

  close(): void { this.database.close(); }
}
