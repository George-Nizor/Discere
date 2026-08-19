CREATE TABLE IF NOT EXISTS journey_progress (
  user_id TEXT NOT NULL,
  journey_id TEXT NOT NULL,
  stage_id TEXT NOT NULL,
  state TEXT NOT NULL,
  interaction_state TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL,
  PRIMARY KEY (user_id, journey_id, stage_id)
);
CREATE TABLE IF NOT EXISTS essay_drafts (
  user_id TEXT NOT NULL,
  essay_id TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  submitted INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT,
  PRIMARY KEY (user_id, essay_id)
);
CREATE TABLE IF NOT EXISTS review_cards (
  user_id TEXT NOT NULL,
  card_id TEXT NOT NULL,
  question_id TEXT NOT NULL,
  concept_ids TEXT NOT NULL,
  front TEXT NOT NULL,
  back TEXT NOT NULL,
  source_ids TEXT NOT NULL,
  due_at TEXT NOT NULL,
  interval_days REAL NOT NULL,
  repetition INTEGER NOT NULL,
  last_outcome TEXT,
  last_evidence TEXT,
  independent_reviews INTEGER NOT NULL DEFAULT 0,
  assisted_reviews INTEGER NOT NULL DEFAULT 0,
  last_reviewed_at TEXT,
  PRIMARY KEY (user_id, card_id)
);
CREATE TABLE IF NOT EXISTS review_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  card_id TEXT NOT NULL,
  revealed INTEGER NOT NULL DEFAULT 0,
  rated INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS notebook_pages (
  user_id TEXT NOT NULL,
  lesson_id TEXT NOT NULL,
  page_type TEXT NOT NULL,
  strokes_json TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL,
  PRIMARY KEY (user_id, lesson_id)
);
CREATE TABLE IF NOT EXISTS transfer_attempts (
  attempt_id TEXT PRIMARY KEY,
  transfer_id TEXT NOT NULL,
  response TEXT NOT NULL,
  correct INTEGER NOT NULL,
  feedback TEXT NOT NULL,
  xp_awarded INTEGER NOT NULL DEFAULT 0,
  mastery REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_attempts_question ON attempts(question_id);
CREATE INDEX IF NOT EXISTS idx_assistance_attempt ON assistance_events(attempt_id);
CREATE INDEX IF NOT EXISTS idx_journey_progress ON journey_progress(user_id, journey_id);
