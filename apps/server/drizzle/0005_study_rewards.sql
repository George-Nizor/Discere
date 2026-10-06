CREATE TABLE IF NOT EXISTS learning_events (
  user_id TEXT NOT NULL,
  event_key TEXT NOT NULL,
  kind TEXT NOT NULL,
  reference_id TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  xp INTEGER NOT NULL DEFAULT 0,
  correct INTEGER NOT NULL DEFAULT 0,
  independent INTEGER NOT NULL DEFAULT 0,
  qualifying INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, event_key)
);
CREATE TABLE IF NOT EXISTS study_preferences (
  user_id TEXT PRIMARY KEY,
  time_zone TEXT NOT NULL,
  daily_goal INTEGER NOT NULL DEFAULT 5,
  motion TEXT NOT NULL DEFAULT 'system',
  celebrations INTEGER NOT NULL DEFAULT 1,
  sound INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS streak_wallet (
  user_id TEXT PRIMARY KEY,
  charges INTEGER NOT NULL DEFAULT 0,
  rewarded_days INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS streak_protections (
  user_id TEXT NOT NULL,
  date TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (user_id, date)
);
ALTER TABLE review_sessions ADD COLUMN scheduled_due_at TEXT;
INSERT OR IGNORE INTO learning_events
  SELECT user_id, 'answer:' || id, 'answer', question_id, created_at, updated_at, 0,
    correct, CASE WHEN mode != 'direct' AND hint_count = 0 AND answer_revealed = 0
      AND NOT EXISTS (SELECT 1 FROM assistance_events WHERE attempt_id = attempts.id AND type = 'tutor_reply')
      THEN 1 ELSE 0 END, 1
  FROM attempts WHERE trim(response) != '';
INSERT OR IGNORE INTO learning_events
  SELECT user_id, 'stage:' || journey_id || ':' || stage_id, 'stage', journey_id,
    updated_at, updated_at, 0, 0, 0, CASE WHEN stage_id LIKE '%:completion' THEN 1 ELSE 0 END
  FROM journey_progress WHERE state = 'completed';
INSERT OR IGNORE INTO learning_events
  SELECT a.user_id, 'transfer:' || t.transfer_id, 'transfer', t.transfer_id,
    t.created_at, t.updated_at, 0, t.correct, 0, 1
  FROM transfer_attempts t JOIN attempts a ON a.id = t.attempt_id WHERE trim(t.response) != ''
  ORDER BY t.correct DESC, t.created_at;
INSERT OR IGNORE INTO learning_events
  SELECT user_id, 'historical-review:' || card_id, 'review', card_id,
    last_reviewed_at, last_reviewed_at, 0, CASE WHEN last_outcome = 'correct' THEN 1 ELSE 0 END,
    CASE WHEN last_evidence = 'independent' THEN 1 ELSE 0 END,
    CASE WHEN EXISTS (SELECT 1 FROM review_sessions s WHERE s.card_id = review_cards.card_id
      AND s.rated = 1 AND trim(s.response) != '') THEN 1 ELSE 0 END
  FROM review_cards WHERE last_reviewed_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_learning_events_date ON learning_events(user_id, occurred_at);
