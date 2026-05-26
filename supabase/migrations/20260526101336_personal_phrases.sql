-- Personal phrases + student dismissals
--
-- NOTE ON TABLE CHOICE: the original spec placed `student_id` on `phrase_bank`,
-- but in this codebase `phrase_bank` is global, deduplicated phrase *content*
-- (reused across groups, keyed by english text) and has no `group_id`. The
-- per-group queue lives in `session_phrases` (`group_id`, `phrase_id`,
-- `session_number`, `in_library`). Scope therefore belongs on `session_phrases`,
-- alongside `group_id`, so personal phrases inherit the existing rotation /
-- mastery / library lifecycle with no other query rewrites.
--
--   group_id set / student_id NULL  = group phrase (existing behavior, unchanged)
--   student_id set / group_id NULL  = personal phrase scoped to that student
--
-- A row should have either group_id OR student_id, never both. Enforced by
-- convention in the insert paths (no DB constraint in v1).

ALTER TABLE session_phrases
  ADD COLUMN student_id UUID REFERENCES students(id) ON DELETE CASCADE DEFAULT NULL;

CREATE INDEX idx_session_phrases_student_id ON session_phrases(student_id) WHERE student_id IS NOT NULL;

-- Track phrases students have dismissed from their queue.
-- phrase_id references phrase_bank(id) — the stable phrase identity, independent
-- of how the phrase was assigned (group or personal).
CREATE TABLE phrase_dismissals (
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  phrase_id UUID NOT NULL REFERENCES phrase_bank(id) ON DELETE CASCADE,
  dismissed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (student_id, phrase_id)
);

CREATE INDEX idx_phrase_dismissals_student ON phrase_dismissals(student_id);
