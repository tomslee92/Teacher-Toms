-- ============================================================================
-- Session Notes (teacher → student) + Student Feedback Notes (student → teacher)
-- Idempotent: safe to re-run. session_notes / flag column / bucket may already
-- exist from the earlier "Session Notes" rollout (commit 4eee8da).
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- A) session_notes  (Feature 1: teacher → student)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.session_notes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      uuid NOT NULL,
  teacher_id      text NOT NULL,
  teacher_name    text,
  session_date    date NOT NULL,
  note_type       text NOT NULL CHECK (note_type IN ('text','voice','both')),
  text_content    text,
  structured      jsonb,
  audio_url       text,
  audio_duration  int,
  seen_at         timestamptz,
  dismissed_at    timestamptz,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS session_notes_student_idx
  ON public.session_notes (student_id);
CREATE INDEX IF NOT EXISTS session_notes_student_date_idx
  ON public.session_notes (student_id, session_date DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- B) student_notes  (Feature 2: student → teacher)
--    student_id is ALWAYS recorded even when is_anonymous = true; the teacher UI
--    is responsible for honoring anonymity (never shows the name).
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.student_notes (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id            uuid NOT NULL,
  teacher_id            text NOT NULL,
  is_anonymous          boolean NOT NULL DEFAULT false,
  prompt_context        text,                 -- 'continuous' for this build
  note_type             text NOT NULL CHECK (note_type IN ('text','voice','both')),
  text_content          text,
  audio_url             text,
  audio_duration        int,
  teacher_seen_at       timestamptz,
  reply_session_note_id uuid REFERENCES public.session_notes(id),
  created_at            timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS student_notes_student_idx
  ON public.student_notes (student_id);
CREATE INDEX IF NOT EXISTS student_notes_teacher_seen_idx
  ON public.student_notes (teacher_id, teacher_seen_at);
CREATE INDEX IF NOT EXISTS student_notes_teacher_created_idx
  ON public.student_notes (teacher_id, created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- C) Feature flags on students
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS session_notes_enabled    boolean DEFAULT false;
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS student_feedback_enabled boolean DEFAULT false;

-- ─────────────────────────────────────────────────────────────────────────────
-- D) Grants — mirror the qod_comments access model (app uses the anon key via
--    PostgREST for all reads/writes). If your qod_comments table uses RLS with
--    explicit policies instead of open grants, replicate that here in its place.
-- ─────────────────────────────────────────────────────────────────────────────
GRANT ALL ON TABLE public.session_notes TO anon, authenticated;
GRANT ALL ON TABLE public.student_notes TO anon, authenticated;

-- If RLS is enabled on these tables, add permissive policies that match
-- qod_comments. (No-ops/dupes are guarded.)
DO $$
BEGIN
  -- session_notes
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='session_notes' AND rowsecurity) THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='session_notes' AND policyname='session_notes_all') THEN
      CREATE POLICY session_notes_all ON public.session_notes
        FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
    END IF;
  END IF;
  -- student_notes
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='student_notes' AND rowsecurity) THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='student_notes' AND policyname='student_notes_all') THEN
      CREATE POLICY student_notes_all ON public.student_notes
        FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
    END IF;
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- E) Storage bucket: session-notes-audio (public), reused by BOTH features.
--    Paths: teacher-notes/{student_id}/{note_id}.webm   (Feature 1)
--           student-notes/{student_id}/{note_id}.webm   (Feature 2)
--    Mirrors qod-audio public/policy settings.
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('session-notes-audio', 'session-notes-audio', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DO $$
BEGIN
  -- Public read
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='session_notes_audio_read') THEN
    CREATE POLICY session_notes_audio_read ON storage.objects
      FOR SELECT TO anon, authenticated
      USING (bucket_id = 'session-notes-audio');
  END IF;
  -- Insert (uploads via anon key)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='session_notes_audio_insert') THEN
    CREATE POLICY session_notes_audio_insert ON storage.objects
      FOR INSERT TO anon, authenticated
      WITH CHECK (bucket_id = 'session-notes-audio');
  END IF;
END $$;
