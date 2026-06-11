-- Optional goal anchor on the student home (Daily Focus engagement layer).
-- Both nullable; when unset the home is visually unchanged. Apply in the Supabase SQL editor.
ALTER TABLE students ADD COLUMN IF NOT EXISTS goal_title text;
ALTER TABLE students ADD COLUMN IF NOT EXISTS goal_target_date date;
