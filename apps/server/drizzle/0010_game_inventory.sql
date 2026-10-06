-- Items earned by real work (chests, new levels) and spent by hand. Every change is one keyed row,
-- so a grant can never be applied twice and the balance is always the sum of its history.
CREATE TABLE IF NOT EXISTS inventory_ledger (
  user_id TEXT NOT NULL,
  entry_key TEXT NOT NULL,
  item TEXT NOT NULL,
  delta INTEGER NOT NULL,
  reason TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  PRIMARY KEY (user_id, entry_key)
);
-- A switched-on XP boost. Rewards recorded between started_at and ends_at pay a bonus.
CREATE TABLE IF NOT EXISTS xp_boosts (
  user_id TEXT NOT NULL,
  started_at TEXT NOT NULL,
  ends_at TEXT NOT NULL,
  PRIMARY KEY (user_id, started_at)
);
-- The level a learner had when level rewards began, so existing levels are not paid out at once.
CREATE TABLE IF NOT EXISTS game_state (
  user_id TEXT PRIMARY KEY,
  level_rewarded INTEGER NOT NULL
);
