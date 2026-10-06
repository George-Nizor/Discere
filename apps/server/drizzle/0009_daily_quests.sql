-- The day's three quests are chosen once and kept, so finishing one can never swap it for another.
CREATE TABLE IF NOT EXISTS daily_quest_sets (
  user_id TEXT NOT NULL,
  date TEXT NOT NULL,
  quest_ids TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (user_id, date)
);
