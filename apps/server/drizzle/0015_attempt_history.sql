-- Attempt history and missed-question review cards.
--
-- Every response a learner submits is appended to attempt_responses and never rewritten, so the
-- first response to a question, whether it was right, and the number of marked tries can always
-- be read back. The attempts row keeps holding the latest response, as before.
--
-- Everything here is additive. A build from before this migration still runs on the migrated
-- database: it ignores the new table, and its inserts leave the new columns at their defaults.
CREATE TABLE IF NOT EXISTS attempt_responses (
  id TEXT PRIMARY KEY,
  attempt_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  question_id TEXT NOT NULL,
  response TEXT NOT NULL,
  correct INTEGER NOT NULL,
  -- 0 when the response could not be marked (not a number, or the wrong unit). It is kept for
  -- the record and never counts as a try.
  qualifying INTEGER NOT NULL,
  mode TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_attempt_responses_attempt ON attempt_responses(attempt_id);
CREATE INDEX IF NOT EXISTS idx_attempt_responses_question ON attempt_responses(user_id, question_id);

-- 1 once the last allowed miss in a lesson has closed the attempt. An Exam attempt closes
-- without a worked answer, and a closed attempt is enough evidence to finish the stage.
ALTER TABLE attempts ADD COLUMN closed INTEGER NOT NULL DEFAULT 0;

-- 'authored' for a card written with the course, 'question' for a card made from a lesson
-- question the learner missed or had revealed.
ALTER TABLE review_cards ADD COLUMN origin TEXT NOT NULL DEFAULT 'authored';
