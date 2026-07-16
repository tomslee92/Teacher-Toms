-- Wavi per-phrase attempt log — one row per (student, phrase, session_date), upserted
-- within a day (see recordPhraseAttempt). Drives past-session attempt history in Practice.
-- Had no migration file (created ad-hoc during dev) and was missing from production.
-- Idempotent; app reaches PostgREST with the anon key so it must be granted.
CREATE TABLE IF NOT EXISTS public.wavy_phrase_attempts (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id   uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  phrase_id    uuid NOT NULL,                 -- phrase_bank id (kept FK-free, like phrase_exposures)
  session_date date NOT NULL,
  attempts     int  NOT NULL DEFAULT 0,
  passed       boolean NOT NULL DEFAULT false,
  created_at   timestamptz DEFAULT now(),
  UNIQUE (student_id, phrase_id, session_date)
);
CREATE INDEX IF NOT EXISTS wavy_phrase_attempts_student_idx
  ON public.wavy_phrase_attempts (student_id, session_date DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.wavy_phrase_attempts TO anon, authenticated;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='wavy_phrase_attempts' AND rowsecurity)
     AND NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='wavy_phrase_attempts' AND policyname='wavy_phrase_attempts_all') THEN
    CREATE POLICY wavy_phrase_attempts_all ON public.wavy_phrase_attempts
      FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;
