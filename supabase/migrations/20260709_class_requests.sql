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

-- Group session timing — powers the "수요일 수업까지 3일" line on the request card.
-- Nullable; the card degrades gracefully (omits the countdown) when unset.
ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS session_day  int;   -- 0=Sun … 6=Sat
ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS session_time text;  -- e.g. '20:00'
