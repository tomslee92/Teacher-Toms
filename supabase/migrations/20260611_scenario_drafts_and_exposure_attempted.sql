-- Scenario upgrade: draft-by-default + exposure attempt tracking.
-- Apply in the Supabase SQL editor. Tables are already granted to anon.

-- Draft/publish: new scenarios default to draft (is_active=false); teacher publishes explicitly.
-- (Existing rows keep their current value; the builder sets is_active per save/publish.)
ALTER TABLE scenarios ALTER COLUMN is_active SET DEFAULT false;

-- Exposure tracking gains: attempted (did the student try saying this line?) + last_exposed_at.
-- The 4-5th-exposure reminder only fires when attempted = false. phrase_id already holds the
-- student-role scenario_lines.id (kept as-is; functions as the spec's line_id).
ALTER TABLE phrase_exposures ADD COLUMN IF NOT EXISTS attempted boolean NOT NULL DEFAULT false;
ALTER TABLE phrase_exposures ADD COLUMN IF NOT EXISTS last_exposed_at timestamptz;
