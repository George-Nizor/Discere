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
