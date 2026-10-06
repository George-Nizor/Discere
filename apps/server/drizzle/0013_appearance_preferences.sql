-- Appearance: dark, light or the device's choice, and the animated galaxy or a calm gradient behind the interface.
ALTER TABLE study_preferences ADD COLUMN theme TEXT NOT NULL DEFAULT 'dark';
ALTER TABLE study_preferences ADD COLUMN backdrop TEXT NOT NULL DEFAULT 'galaxy';
