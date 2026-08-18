-- FSRS replaces the fixed interval ladder, so a card now carries its own memory state.
-- Existing rows keep their due date and take the empty-card defaults, which puts them back in
-- learning rather than inventing a stability they never earned.
ALTER TABLE review_cards ADD COLUMN course_id TEXT NOT NULL DEFAULT '';
ALTER TABLE review_cards ADD COLUMN stability REAL NOT NULL DEFAULT 0;
ALTER TABLE review_cards ADD COLUMN difficulty REAL NOT NULL DEFAULT 0;
ALTER TABLE review_cards ADD COLUMN lapses INTEGER NOT NULL DEFAULT 0;
ALTER TABLE review_cards ADD COLUMN phase TEXT NOT NULL DEFAULT 'new';
ALTER TABLE review_cards ADD COLUMN learning_step INTEGER NOT NULL DEFAULT 0;
ALTER TABLE review_cards ADD COLUMN elapsed_days REAL NOT NULL DEFAULT 0;
ALTER TABLE review_cards ADD COLUMN scheduled_days REAL NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_review_cards_due ON review_cards(user_id, due_at);
CREATE INDEX IF NOT EXISTS idx_review_cards_course ON review_cards(user_id, course_id);
