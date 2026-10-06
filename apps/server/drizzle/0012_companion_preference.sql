-- Whether the companion pet is shown. On by default; the learner can tuck it away in Settings.
ALTER TABLE study_preferences ADD COLUMN companion INTEGER NOT NULL DEFAULT 1;
