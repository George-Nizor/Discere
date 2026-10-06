ALTER TABLE review_sessions ADD COLUMN mode TEXT NOT NULL DEFAULT 'coach';
ALTER TABLE review_sessions ADD COLUMN response TEXT;
ALTER TABLE review_sessions ADD COLUMN correct INTEGER;
