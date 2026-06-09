-- Scenario categories: group multiple situations under one theme (e.g. "GOLF" →
-- "Checking in at the hotel", "Checking in at the golf club", ...). Free-text label on
-- the scenario; grouping is display-only (assignment still decides who sees each one).
-- Apply in the Supabase SQL editor. The scenarios table is already granted to anon.
ALTER TABLE scenarios ADD COLUMN IF NOT EXISTS category text;
