CREATE TABLE course_check_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  course_id TEXT NOT NULL,
  check_id TEXT NOT NULL,
  check_hash TEXT NOT NULL,
  course_title TEXT NOT NULL,
  definition_json TEXT NOT NULL,
  lesson_titles_json TEXT NOT NULL,
  responses_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  completed_at TEXT,
  xp INTEGER NOT NULL DEFAULT 0,
  UNIQUE(user_id, course_id, check_id, check_hash)
);
CREATE INDEX course_check_by_user ON course_check_sessions(user_id, course_id, completed_at);
