-- ============================================================================
-- Session attendance (teacher-captured). One row per student per session date;
-- powers the teacher-dashboard pulse (attendance + minutes) and the per-student
-- 출석 기록 log. Captured in the post-session wrap-up. Idempotent.
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.attendance (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id   uuid NOT NULL,
  group_id     uuid,
  session_date date NOT NULL,
  attended     boolean NOT NULL DEFAULT false,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now(),
  UNIQUE (student_id, session_date)   -- one record per student per session day
);

CREATE INDEX IF NOT EXISTS attendance_student_idx    ON public.attendance (student_id, session_date DESC);
CREATE INDEX IF NOT EXISTS attendance_group_date_idx ON public.attendance (group_id, session_date DESC);

-- App reaches PostgREST with the anon key → grant (same as class_requests / session_notes).
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance TO anon, authenticated;

-- Permissive RLS policy, only if RLS is enabled (no-op otherwise).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='attendance' AND rowsecurity) THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='attendance' AND policyname='attendance_all') THEN
      CREATE POLICY attendance_all ON public.attendance
        FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
    END IF;
  END IF;
END $$;
