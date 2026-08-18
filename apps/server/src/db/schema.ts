import { integer, primaryKey, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const userProfiles = sqliteTable("user_profiles", {
  id: text("id").primaryKey(), learnerName: text("learner_name").notNull(), xp: integer("xp").notNull().default(0), streakDays: integer("streak_days").notNull().default(0), createdAt: text("created_at").notNull(), updatedAt: text("updated_at").notNull(),
});
export const conceptProgress = sqliteTable("concept_progress", {
  userId: text("user_id").notNull(), conceptId: text("concept_id").notNull(), state: text("state").notNull(), mastery: real("mastery").notNull().default(0), independentAttempts: integer("independent_attempts").notNull().default(0), assistedAttempts: integer("assisted_attempts").notNull().default(0), updatedAt: text("updated_at").notNull(),
}, (table) => [primaryKey({ columns: [table.userId, table.conceptId] })]);
export const attempts = sqliteTable("attempts", {
  id: text("id").primaryKey(), userId: text("user_id").notNull(), questionId: text("question_id").notNull(), response: text("response").notNull(), mode: text("mode").notNull(), correct: integer("correct", { mode: "boolean" }).notNull(), feedback: text("feedback").notNull(), hintCount: integer("hint_count").notNull().default(0), answerRevealed: integer("answer_revealed", { mode: "boolean" }).notNull().default(false), xpAwarded: integer("xp_awarded").notNull().default(0), mastery: real("mastery").notNull().default(0), createdAt: text("created_at").notNull(), updatedAt: text("updated_at").notNull(),
});
export const assistanceEvents = sqliteTable("assistance_events", {
  id: text("id").primaryKey(), attemptId: text("attempt_id").notNull(), type: text("type").notNull(), detail: text("detail"), createdAt: text("created_at").notNull(),
});
export const revealSessions = sqliteTable("reveal_sessions", {
  token: text("token").primaryKey(), attemptId: text("attempt_id").notNull(), reason: text("reason").notNull(), availableAt: text("available_at").notNull(), usedAt: text("used_at"), createdAt: text("created_at").notNull(),
});
export const writingGateRuns = sqliteTable("writing_gate_runs", {
  id: text("id").primaryKey(), context: text("context").notNull(), passed: integer("passed", { mode: "boolean" }).notNull(), textHash: text("text_hash").notNull(), violationCount: integer("violation_count").notNull(), createdAt: text("created_at").notNull(),
});
export const notebookPages = sqliteTable("notebook_pages", {
  userId: text("user_id").notNull(), lessonId: text("lesson_id").notNull(), pageType: text("page_type").notNull(), strokesJson: text("strokes_json").notNull(), note: text("note").notNull().default(""), updatedAt: text("updated_at").notNull(),
}, (table) => [primaryKey({ columns: [table.userId, table.lessonId] })]);
export const transferAttempts = sqliteTable("transfer_attempts", {
  attemptId: text("attempt_id").primaryKey(), transferId: text("transfer_id").notNull(), response: text("response").notNull(), correct: integer("correct", { mode: "boolean" }).notNull(), feedback: text("feedback").notNull(), xpAwarded: integer("xp_awarded").notNull().default(0), mastery: real("mastery").notNull().default(0), createdAt: text("created_at").notNull(), updatedAt: text("updated_at").notNull(),
});
export const journeyProgress = sqliteTable("journey_progress", {
  userId: text("user_id").notNull(), journeyId: text("journey_id").notNull(), stageId: text("stage_id").notNull(), state: text("state").notNull(), interactionState: text("interaction_state").notNull().default("{}"), updatedAt: text("updated_at").notNull(),
}, (table) => [primaryKey({ columns: [table.userId, table.journeyId, table.stageId] })]);
export const essayDrafts = sqliteTable("essay_drafts", {
  userId: text("user_id").notNull(), essayId: text("essay_id").notNull(), content: text("content").notNull().default(""), submitted: integer("submitted", { mode: "boolean" }).notNull().default(false), updatedAt: text("updated_at"),
}, (table) => [primaryKey({ columns: [table.userId, table.essayId] })]);
/** One generated assessment per submitted essay. A generation can take minutes, so the row
 * carries its own status and the client polls it instead of holding a request open. */
export const essayAssessments = sqliteTable("essay_assessments", {
  userId: text("user_id").notNull(), essayId: text("essay_id").notNull(), requestId: text("request_id").notNull(), status: text("status").notNull(), provider: text("provider").notNull(), accepted: integer("accepted", { mode: "boolean" }).notNull().default(false), assessmentJson: text("assessment_json"), issuesJson: text("issues_json").notNull().default("[]"), errorCode: text("error_code"), errorMessage: text("error_message"), updatedAt: text("updated_at").notNull(),
}, (table) => [primaryKey({ columns: [table.userId, table.essayId] })]);
/** One flashcard's FSRS memory state. `stability`, `difficulty`, `lapses`, `phase`, and
 * `learning_step` are the scheduler's own state; the review counters stay separate so the
 * interface can still say whether a card was earned independently. */
export const reviewCards = sqliteTable("review_cards", {
  userId: text("user_id").notNull(), cardId: text("card_id").notNull(), courseId: text("course_id").notNull().default(""), questionId: text("question_id").notNull(), conceptIds: text("concept_ids").notNull(), front: text("front").notNull(), back: text("back").notNull(), sourceIds: text("source_ids").notNull(), dueAt: text("due_at").notNull(), intervalDays: real("interval_days").notNull(), repetition: integer("repetition").notNull(), lastOutcome: text("last_outcome"), lastEvidence: text("last_evidence"), independentReviews: integer("independent_reviews").notNull().default(0), assistedReviews: integer("assisted_reviews").notNull().default(0), lastReviewedAt: text("last_reviewed_at"), stability: real("stability").notNull().default(0), difficulty: real("difficulty").notNull().default(0), lapses: integer("lapses").notNull().default(0), phase: text("phase").notNull().default("new"), learningStep: integer("learning_step").notNull().default(0), elapsedDays: real("elapsed_days").notNull().default(0), scheduledDays: real("scheduled_days").notNull().default(0),
}, (table) => [primaryKey({ columns: [table.userId, table.cardId] })]);
export const reviewSessions = sqliteTable("review_sessions", {
  id: text("id").primaryKey(), userId: text("user_id").notNull(), cardId: text("card_id").notNull(), revealed: integer("revealed", { mode: "boolean" }).notNull().default(false), rated: integer("rated", { mode: "boolean" }).notNull().default(false), createdAt: text("created_at").notNull(),
});
/** Applied-migration ledger owned by `src/db/migrations.ts`. */
export const schemaMigrations = sqliteTable("schema_migrations", {
  name: text("name").primaryKey(), appliedAt: text("applied_at").notNull(),
});
