-- Shared scenario assignment: one scenario assigned to many students / groups / everyone.
-- Apply in the Supabase SQL editor. Safe to re-run.
-- Each row targets a single student, a single group, or everyone (both null). A scenario
-- may have many rows. Availability is now read through this table, not scenarios.student_id/group_id.

CREATE TABLE IF NOT EXISTS scenario_assignments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id uuid NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
  student_id  uuid REFERENCES students(id) ON DELETE CASCADE,
  group_id    uuid REFERENCES groups(id)   ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_scenario_assignments_scenario ON scenario_assignments(scenario_id);
CREATE INDEX IF NOT EXISTS idx_scenario_assignments_student  ON scenario_assignments(student_id);
CREATE INDEX IF NOT EXISTS idx_scenario_assignments_group    ON scenario_assignments(group_id);

-- Backfill: mirror each existing scenario's single scope into one assignment row so
-- nothing already created loses its availability.
INSERT INTO scenario_assignments (scenario_id, student_id, group_id)
SELECT s.id, s.student_id, s.group_id
FROM scenarios s
WHERE NOT EXISTS (SELECT 1 FROM scenario_assignments a WHERE a.scenario_id = s.id);

-- Grant the app role (anon key) access — SQL-editor tables don't auto-grant (see 20260606).
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scenario_assignments TO anon, authenticated;
