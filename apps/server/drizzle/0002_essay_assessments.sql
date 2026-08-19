CREATE TABLE IF NOT EXISTS essay_assessments (
  user_id TEXT NOT NULL,
  essay_id TEXT NOT NULL,
  request_id TEXT NOT NULL,
  status TEXT NOT NULL,
  provider TEXT NOT NULL,
  accepted INTEGER NOT NULL DEFAULT 0,
  assessment_json TEXT,
  issues_json TEXT NOT NULL DEFAULT '[]',
  error_code TEXT,
  error_message TEXT,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (user_id, essay_id)
);
