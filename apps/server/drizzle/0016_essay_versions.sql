-- rollback-safe: adds one table; the previous version ignores it.
-- Earlier versions of a writing task.
--
-- When a learner chooses to revise submitted writing, the submitted text and the assessment it
-- received are appended here as one row and never rewritten. essay_drafts keeps holding the
-- version being written or last submitted, and essay_assessments its assessment, as before, so
-- a build from before this migration still runs on the migrated database: it shows the current
-- version and ignores the earlier ones.
CREATE TABLE IF NOT EXISTS essay_versions (
  user_id TEXT NOT NULL,
  essay_id TEXT NOT NULL,
  -- 1 for the first submission. The version being written is the highest number here plus one.
  version INTEGER NOT NULL,
  content TEXT NOT NULL,
  submitted_at TEXT,
  -- The assessment of this version, or NULL throughout when none was requested.
  request_id TEXT,
  status TEXT,
  provider TEXT,
  accepted INTEGER NOT NULL DEFAULT 0,
  assessment_json TEXT,
  issues_json TEXT NOT NULL DEFAULT '[]',
  error_code TEXT,
  error_message TEXT,
  assessed_at TEXT,
  archived_at TEXT NOT NULL,
  PRIMARY KEY (user_id, essay_id, version)
);
