-- Retire phrase_pins by folding phrase nominations into class_requests.
--
-- class_requests becomes the single source of truth for both:
--   kind='phrase'        → phrase nominations (was phrase_pins) — teacher AddPhrasesTab
--   kind='text'|'voice'  → topic requests (composer) — teacher Inbox 리퀘스트
-- Every read kind-filters to its surface, so the two features stay visually separate
-- while sharing one table. phrase_pins is LEFT IN PLACE (retired, not dropped) as a
-- backup until the migration is verified in production.
--
-- Idempotent: nullable ADD COLUMN IF NOT EXISTS + a de-duplicated backfill.

ALTER TABLE public.class_requests ADD COLUMN IF NOT EXISTS korean  text;
ALTER TABLE public.class_requests ADD COLUMN IF NOT EXISTS context text;
ALTER TABLE public.class_requests ADD COLUMN IF NOT EXISTS source  text;

-- Backfill existing pins → class_requests (skip any already migrated).
INSERT INTO public.class_requests
  (student_id, group_id, kind, content, korean, context, source, phrase_id, status, created_at)
SELECT p.student_id, p.group_id, 'phrase', p.english, p.korean, p.context, p.source, p.phrase_id, 'new',
       COALESCE(p.created_at, now())
FROM public.phrase_pins p
WHERE p.english IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.class_requests c
    WHERE c.student_id = p.student_id AND c.kind = 'phrase' AND c.content = p.english
  );
