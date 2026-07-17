-- Listen → Shadowing flow (⑩⑪): starter/collection scenario support + completion tracking.
-- Data (starter scenarios + Narim Australia pack) is seeded separately via a REST script,
-- not here, to avoid a 110-row SQL paste. This migration is schema only.

-- Per-scenario metadata for starters + curated collections.
ALTER TABLE public.scenarios ADD COLUMN IF NOT EXISTS is_starter    boolean DEFAULT false;
ALTER TABLE public.scenarios ADD COLUMN IF NOT EXISTS other_voice_id text;  -- override of SCENARIO_OTHER_VOICE_ID; null = default
ALTER TABLE public.scenarios ADD COLUMN IF NOT EXISTS collection    text;   -- groups an arc, e.g. 'narim-australia'
ALTER TABLE public.scenarios ADD COLUMN IF NOT EXISTS sort_order    int;    -- position within a collection

-- One row per (student, scenario) they've completed at least once. The ONLY persistence
-- in the flow — deliberately no score/duration columns (engagement metric is time only).
-- Mirrors scenario_assignments: uuid student_id → students(id), grants to anon/authenticated,
-- RLS left off (consistent with its sibling tables created the same way).
CREATE TABLE IF NOT EXISTS public.scenario_completions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id   uuid NOT NULL REFERENCES students(id)  ON DELETE CASCADE,
  scenario_id  uuid NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
  completed_at timestamptz DEFAULT now(),
  UNIQUE (student_id, scenario_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scenario_completions TO anon, authenticated;
