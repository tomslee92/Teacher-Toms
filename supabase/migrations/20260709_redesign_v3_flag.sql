-- Redesign v3 rollout flag (per-student). NULL/false = student sees the current
-- (legacy) UI; true = student sees the redesigned IA, tokens, Pretendard, tab bar,
-- home, and session flows. Toms Lee / teacher accounts see it via a name fallback in
-- code (isRedesignV3), so this column only needs to be flipped for real students at
-- rollout time. Toggled from the teacher dashboard student-detail modal.
--
-- Nullable boolean, defaults to false. No index needed (per-row lookup by student).
ALTER TABLE students ADD COLUMN IF NOT EXISTS redesign_v3_enabled boolean DEFAULT false;
