CREATE TABLE python_project_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  course_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  project_hash TEXT NOT NULL,
  definition_json TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('coach','assisted','direct','exam')),
  revision INTEGER NOT NULL DEFAULT 0,
  current_index INTEGER NOT NULL DEFAULT 0,
  states_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  completed_at TEXT,
  xp INTEGER NOT NULL DEFAULT 0,
  UNIQUE(user_id, course_id, project_id, project_hash)
);
CREATE TABLE python_project_actions (
  session_id TEXT NOT NULL REFERENCES python_project_sessions(id),
  request_id TEXT NOT NULL,
  request_json TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  PRIMARY KEY(session_id, request_id)
);
CREATE INDEX python_project_by_user ON python_project_sessions(user_id, course_id, completed_at);
