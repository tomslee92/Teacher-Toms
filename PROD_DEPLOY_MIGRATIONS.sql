-- ============================================================================
-- WAYVE — consolidated pre-production migration bundle (2026-07-16)
--
-- Run this ONCE in the PRODUCTION Supabase SQL editor BEFORE deploying the
-- redesign-v3 code to production. It is FULLY IDEMPOTENT: it creates anything
-- missing and skips anything that already exists — zero "already exists" errors,
-- safe to run more than once.
--
-- Covers every migration the branch adds on top of the current production app:
--   personal phrases · session/student notes · scenarios (+assignments, category,
--   intro, drafts, exposure) · student goals · redesign_v3 flag · class requests ·
--   attendance · group schedule.
--
-- Part 2 (bottom) is a READ-ONLY verification query — run it after, to confirm
-- every expected table/column exists (including tables that were created ad-hoc
-- during development and have no migration file).
-- ============================================================================


-- ── 1) Personal phrases + dismissals ────────────────────────────────────────
-- (Original migration used bare CREATE TABLE/INDEX and lacked a grant — fixed here.)
ALTER TABLE public.session_phrases
  ADD COLUMN IF NOT EXISTS student_id uuid REFERENCES students(id) ON DELETE CASCADE DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_session_phrases_student_id
  ON public.session_phrases(student_id) WHERE student_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.phrase_dismissals (
  student_id   uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  phrase_id    uuid NOT NULL REFERENCES phrase_bank(id) ON DELETE CASCADE,
  dismissed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (student_id, phrase_id)
);
CREATE INDEX IF NOT EXISTS idx_phrase_dismissals_student ON public.phrase_dismissals(student_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.phrase_dismissals TO anon, authenticated;


-- ── 2) Session notes (teacher→student) + student notes (student→teacher) ─────
CREATE TABLE IF NOT EXISTS public.session_notes (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id     uuid NOT NULL,
  teacher_id     text NOT NULL,
  teacher_name   text,
  session_date   date NOT NULL,
  note_type      text NOT NULL CHECK (note_type IN ('text','voice','both')),
  text_content   text,
  structured     jsonb,
  audio_url      text,
  audio_duration int,
  seen_at        timestamptz,
  dismissed_at   timestamptz,
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS session_notes_student_idx      ON public.session_notes (student_id);
CREATE INDEX IF NOT EXISTS session_notes_student_date_idx ON public.session_notes (student_id, session_date DESC);

CREATE TABLE IF NOT EXISTS public.student_notes (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id            uuid NOT NULL,
  teacher_id            text NOT NULL,
  is_anonymous          boolean NOT NULL DEFAULT false,
  prompt_context        text,
  note_type             text NOT NULL CHECK (note_type IN ('text','voice','both')),
  text_content          text,
  audio_url             text,
  audio_duration        int,
  teacher_seen_at       timestamptz,
  reply_session_note_id uuid REFERENCES public.session_notes(id),
  created_at            timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS student_notes_student_idx       ON public.student_notes (student_id);
CREATE INDEX IF NOT EXISTS student_notes_teacher_seen_idx  ON public.student_notes (teacher_id, teacher_seen_at);
CREATE INDEX IF NOT EXISTS student_notes_teacher_created_idx ON public.student_notes (teacher_id, created_at DESC);

ALTER TABLE public.students ADD COLUMN IF NOT EXISTS session_notes_enabled    boolean DEFAULT false;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS student_feedback_enabled boolean DEFAULT false;

GRANT ALL ON TABLE public.session_notes TO anon, authenticated;
GRANT ALL ON TABLE public.student_notes TO anon, authenticated;

INSERT INTO storage.buckets (id, name, public)
VALUES ('session-notes-audio', 'session-notes-audio', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='session_notes' AND rowsecurity)
     AND NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='session_notes' AND policyname='session_notes_all') THEN
    CREATE POLICY session_notes_all ON public.session_notes FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='student_notes' AND rowsecurity)
     AND NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='student_notes' AND policyname='student_notes_all') THEN
    CREATE POLICY student_notes_all ON public.student_notes FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='session_notes_audio_read') THEN
    CREATE POLICY session_notes_audio_read ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'session-notes-audio');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='session_notes_audio_insert') THEN
    CREATE POLICY session_notes_audio_insert ON storage.objects FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'session-notes-audio');
  END IF;
END $$;


-- ── 3) Scenarios (+ lines, exposure, assignments, category, intro, drafts) ───
ALTER TABLE public.phrase_bank ADD COLUMN IF NOT EXISTS wavi_video_url text;

CREATE TABLE IF NOT EXISTS public.scenarios (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title               text NOT NULL,
  context_description text,
  student_id          uuid REFERENCES students(id) ON DELETE CASCADE,
  group_id            uuid REFERENCES groups(id)   ON DELETE CASCADE,
  created_by          text,
  is_active           boolean NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_scenarios_student ON public.scenarios(student_id);
CREATE INDEX IF NOT EXISTS idx_scenarios_group   ON public.scenarios(group_id);
ALTER TABLE public.scenarios ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE public.scenarios ADD COLUMN IF NOT EXISTS intro    text;
ALTER TABLE public.scenarios ALTER COLUMN is_active SET DEFAULT false;

CREATE TABLE IF NOT EXISTS public.scenario_lines (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id    uuid NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
  sequence_order int  NOT NULL,
  speaker        text NOT NULL CHECK (speaker IN ('other', 'student')),
  english_text   text,
  korean_text    text,
  wavi_video_url text,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_scenario_lines_scenario ON public.scenario_lines(scenario_id, sequence_order);

CREATE TABLE IF NOT EXISTS public.phrase_exposures (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id     uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  phrase_id      uuid,
  exposure_count int NOT NULL DEFAULT 1,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, phrase_id)
);
CREATE INDEX IF NOT EXISTS idx_phrase_exposures_student ON public.phrase_exposures(student_id);
ALTER TABLE public.phrase_exposures ADD COLUMN IF NOT EXISTS attempted       boolean NOT NULL DEFAULT false;
ALTER TABLE public.phrase_exposures ADD COLUMN IF NOT EXISTS last_exposed_at timestamptz;

CREATE TABLE IF NOT EXISTS public.scenario_assignments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id uuid NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
  student_id  uuid REFERENCES students(id) ON DELETE CASCADE,
  group_id    uuid REFERENCES groups(id)   ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_scenario_assignments_scenario ON public.scenario_assignments(scenario_id);
CREATE INDEX IF NOT EXISTS idx_scenario_assignments_student  ON public.scenario_assignments(student_id);
CREATE INDEX IF NOT EXISTS idx_scenario_assignments_group    ON public.scenario_assignments(group_id);
-- Backfill each existing scenario's single scope into one assignment row (idempotent).
INSERT INTO public.scenario_assignments (scenario_id, student_id, group_id)
SELECT s.id, s.student_id, s.group_id FROM public.scenarios s
WHERE NOT EXISTS (SELECT 1 FROM public.scenario_assignments a WHERE a.scenario_id = s.id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.scenarios, public.scenario_lines, public.phrase_exposures, public.scenario_assignments TO anon, authenticated;


-- ── 4) Student goals (home Daily Focus anchor) ──────────────────────────────
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS goal_title       text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS goal_target_date date;


-- ── 5) Redesign v3 rollout flag (per student) ───────────────────────────────
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS redesign_v3_enabled boolean DEFAULT false;


-- ── 6) Class requests (student → teacher input loop) ────────────────────────
CREATE TABLE IF NOT EXISTS public.class_requests (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  group_id   uuid,
  kind       text NOT NULL DEFAULT 'text' CHECK (kind IN ('voice','text','phrase')),
  content    text,
  audio_url  text,
  phrase_id  uuid,
  status     text NOT NULL DEFAULT 'new' CHECK (status IN ('new','planned','covered')),
  created_at timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.class_requests TO anon, authenticated;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='class_requests' AND rowsecurity)
     AND NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='class_requests' AND policyname='class_requests_all') THEN
    CREATE POLICY class_requests_all ON public.class_requests FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;
ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS session_day  int;
ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS session_time text;


-- ── 7) Attendance (teacher-captured; powers the pulse) ──────────────────────
CREATE TABLE IF NOT EXISTS public.attendance (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id   uuid NOT NULL,
  group_id     uuid,
  session_date date NOT NULL,
  attended     boolean NOT NULL DEFAULT false,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now(),
  UNIQUE (student_id, session_date)
);
CREATE INDEX IF NOT EXISTS attendance_student_idx    ON public.attendance (student_id, session_date DESC);
CREATE INDEX IF NOT EXISTS attendance_group_date_idx ON public.attendance (group_id, session_date DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance TO anon, authenticated;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='attendance' AND rowsecurity)
     AND NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='attendance' AND policyname='attendance_all') THEN
    CREATE POLICY attendance_all ON public.attendance FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;


-- ── 8) Group schedule (weekly recurring slots) ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.group_schedule (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id     uuid NOT NULL,
  day_of_week  int  NOT NULL,
  start_time   text NOT NULL,
  duration_min int  DEFAULT 90,
  created_at   timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS group_schedule_group_idx ON public.group_schedule (group_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.group_schedule TO anon, authenticated;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='group_schedule' AND rowsecurity)
     AND NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='group_schedule' AND policyname='group_schedule_all') THEN
    CREATE POLICY group_schedule_all ON public.group_schedule FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;


-- ============================================================================
-- PART 2 — READ-ONLY VERIFICATION (run separately after the above).
-- Every row should read exists = true. Any `false` is a table the deployed code
-- expects but production is missing → fix before deploying. This also covers
-- tables with no migration file (created via the Table Editor during dev); if
-- prod Supabase == your dev Supabase they will already exist.
-- ============================================================================
SELECT t AS table_name, to_regclass('public.'||t) IS NOT NULL AS exists
FROM unnest(ARRAY[
  -- from this bundle
  'phrase_dismissals','session_notes','student_notes','scenarios','scenario_lines',
  'phrase_exposures','scenario_assignments','class_requests','attendance','group_schedule',
  -- no migration file — must already exist in prod
  'qod_prompts','qod_responses','qod_reactions','qod_comments','city_groups','city_group_members',
  'phrase_pins','phrase_tags','student_dues','student_messages','wavy_sessions','wavy_memory',
  'wavy_phrase_attempts','typing_indicators','situation_tags','pronunciation_fixes','feedback_flags',
  'session_phrases','student_phrases','student_progress','phrase_bank','groups','students','active_time_segments'
]) AS t
ORDER BY exists, table_name;

-- Key added COLUMNS (each should return one row):
SELECT table_name || '.' || column_name AS present FROM information_schema.columns
WHERE table_schema='public' AND (
  (table_name='session_phrases' AND column_name='student_id') OR
  (table_name='students'        AND column_name IN ('redesign_v3_enabled','goal_title','session_notes_enabled')) OR
  (table_name='scenarios'       AND column_name IN ('category','intro')) OR
  (table_name='phrase_bank'     AND column_name='wavi_video_url') OR
  (table_name='phrase_exposures'AND column_name='attempted') OR
  (table_name='groups'          AND column_name='session_day')
) ORDER BY 1;
