-- ============================================================================
-- Per-group weekly class schedule. Multiple rows per group = multiple sessions/
-- week (e.g. Judy 3×/week). Source of truth for the teacher dashboard's next/last
-- session logic + the student request-card countdown. Supersedes the single
-- groups.session_day / session_time columns (kept as a fallback). Idempotent.
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.group_schedule (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id     uuid NOT NULL,
  day_of_week  int  NOT NULL,          -- 0=Sun … 6=Sat
  start_time   text NOT NULL,          -- 'HH:MM' local (KST)
  duration_min int  DEFAULT 90,
  created_at   timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS group_schedule_group_idx ON public.group_schedule (group_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.group_schedule TO anon, authenticated;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='group_schedule' AND rowsecurity) THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='group_schedule' AND policyname='group_schedule_all') THEN
      CREATE POLICY group_schedule_all ON public.group_schedule
        FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
    END IF;
  END IF;
END $$;
