CREATE TABLE IF NOT EXISTS user_profiles (
  id TEXT PRIMARY KEY,
  learner_name TEXT NOT NULL,
  xp INTEGER NOT NULL DEFAULT 0,
  streak_days INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS concept_progress (
  user_id TEXT NOT NULL,
  concept_id TEXT NOT NULL,
  state TEXT NOT NULL,
  mastery REAL NOT NULL DEFAULT 0,
  independent_attempts INTEGER NOT NULL DEFAULT 0,
  assisted_attempts INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (user_id, concept_id)
);
CREATE TABLE IF NOT EXISTS attempts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  question_id TEXT NOT NULL,
  response TEXT NOT NULL,
  mode TEXT NOT NULL,
  correct INTEGER NOT NULL,
  feedback TEXT NOT NULL,
  hint_count INTEGER NOT NULL DEFAULT 0,
  answer_revealed INTEGER NOT NULL DEFAULT 0,
  xp_awarded INTEGER NOT NULL DEFAULT 0,
  mastery REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS assistance_events (
  id TEXT PRIMARY KEY,
  attempt_id TEXT NOT NULL,
  type TEXT NOT NULL,
  detail TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS reveal_sessions (
  token TEXT PRIMARY KEY,
  attempt_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  available_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS writing_gate_runs (
  id TEXT PRIMARY KEY,
  context TEXT NOT NULL,
  passed INTEGER NOT NULL,
  text_hash TEXT NOT NULL,
  violation_count INTEGER NOT NULL,
  created_at TEXT NOT NULL
);
