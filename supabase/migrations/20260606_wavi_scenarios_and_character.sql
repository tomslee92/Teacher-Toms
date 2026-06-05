-- Wavi: scenarios (Listen/Shadowing Mode), pre-rendered character video, exposure tracking
-- 2026-06. Apply in the Supabase SQL editor (or `supabase db push`).
-- Safe to run more than once — every statement is guarded with IF [NOT] EXISTS.

-- 1) Pre-rendered Wavi video for a phrase. When present, Mode 1 plays the video
--    instead of the static speaking image + ElevenLabs audio. NULL = fall back to static.
ALTER TABLE phrase_bank ADD COLUMN IF NOT EXISTS wavi_video_url text;

-- 2) Scenarios — a curated, scenario-based conversation flow (Listen Mode).
--    Scoped to a single student OR a group (either may be null).
CREATE TABLE IF NOT EXISTS scenarios (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title               text NOT NULL,
  context_description text,
  student_id          uuid REFERENCES students(id) ON DELETE CASCADE,
  group_id            uuid REFERENCES groups(id)   ON DELETE CASCADE,
  created_by          text,
  is_active           boolean NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_scenarios_student ON scenarios(student_id);
CREATE INDEX IF NOT EXISTS idx_scenarios_group   ON scenarios(group_id);

-- 3) Scenario lines — the alternating conversation turns.
--    speaker = 'other'  -> played with SCENARIO_OTHER_VOICE_ID
--    speaker = 'student'-> read aloud with WAVY_VOICE_ID (the line the student follows / shadows)
CREATE TABLE IF NOT EXISTS scenario_lines (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id    uuid NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
  sequence_order int  NOT NULL,
  speaker        text NOT NULL CHECK (speaker IN ('other', 'student')),
  english_text   text,
  korean_text    text,
  wavi_video_url text,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_scenario_lines_scenario ON scenario_lines(scenario_id, sequence_order);

-- 4) Exposure tracking — counts how many times a student has been exposed to a
--    STUDENT-ROLE line in Listen Mode. phrase_id holds the scenario_lines.id of that
--    student-role line (named phrase_id per spec; kept FK-free so it can also reference a
--    phrase_bank phrase in future). Drives the "want to try saying that yourself?" prompts:
--      1-2 = pure listen, 3 = warm offer, 4-5 = gentle reminder, 6+ = stop prompting.
CREATE TABLE IF NOT EXISTS phrase_exposures (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id     uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  phrase_id      uuid,
  exposure_count int NOT NULL DEFAULT 1,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, phrase_id)
);
CREATE INDEX IF NOT EXISTS idx_phrase_exposures_student ON phrase_exposures(student_id);
