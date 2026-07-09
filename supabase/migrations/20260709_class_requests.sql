-- ============================================================================
-- 다음 수업 리퀘스트 (class requests) — the student → teacher input loop that
-- replaces the old "pin a phrase" filing chore. A request is a short message to
-- Toms captured at the moment of motivation (home card, request sheet, Solo post-save).
-- Idempotent: safe to re-run.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.class_requests (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  uuid NOT NULL,
  group_id    uuid,
  kind        text NOT NULL DEFAULT 'text' CHECK (kind IN ('voice','text','phrase')),
  content     text,                 -- the request text (transcript for voice, phrase english for phrase)
  audio_url   text,                 -- nullable; set only for kind='voice'
  phrase_id   uuid,                 -- nullable FK to a saved phrase for kind='phrase'
  status      text NOT NULL DEFAULT 'new' CHECK (status IN ('new','planned','covered')),
  created_at  timestamptz DEFAULT now()
);

-- No indexes needed at this scale (a handful of students; teacher reads all rows).

-- The app reaches PostgREST with the anon key, so a new table must be granted to
-- anon/authenticated (same as scenario_assignments / session_notes) or every
-- db.insert/get on it fails with "permission denied".
GRANT SELECT, INSERT, UPDATE, DELETE ON public.class_requests TO anon, authenticated;

-- If RLS is enabled on the table, add a permissive policy (mirrors session_notes).
-- Guarded so it's a no-op when RLS is off or the policy already exists.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='class_requests' AND rowsecurity) THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='class_requests' AND policyname='class_requests_all') THEN
      CREATE POLICY class_requests_all ON public.class_requests
        FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
    END IF;
  END IF;
END $$;

-- Group session timing — powers the "수요일 수업까지 3일" line on the request card.
-- Nullable; the card degrades gracefully (omits the countdown) when unset.
ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS session_day  int;   -- 0=Sun … 6=Sat
ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS session_time text;  -- e.g. '20:00'
