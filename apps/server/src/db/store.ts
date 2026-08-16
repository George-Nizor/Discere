import { createHash, randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import type { Concept, ConceptProgress, ConceptState, TutoringMode, WritingLintResponse } from "@discere/contracts";

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
      CREATE INDEX IF NOT EXISTS idx_attempts_question ON attempts(question_id);
      CREATE INDEX IF NOT EXISTS idx_assistance_attempt ON assistance_events(attempt_id);
    `);
  }

  private ensureUser(): void {
    const timestamp = now();
    const learnerName = process.env.DISCERE_LEARNER_NAME?.trim() || "Learner";
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
