-- ─────────────────────────────────────────────
--  CASA CASTEL — Kitchen weeks schema additions
--  Paste into Supabase SQL Editor → Run
-- ─────────────────────────────────────────────

-- Tracks how many times the tenant re-uploaded after a flag.
ALTER TABLE kitchen_weeks
  ADD COLUMN IF NOT EXISTS reupload_count int DEFAULT 0;

-- Stores the timestamp when the landlord flagged the week.
ALTER TABLE kitchen_weeks
  ADD COLUMN IF NOT EXISTS flagged_at timestamptz;

-- ─────────────────────────────────────────────
--  CRITICAL: Add kitchen tables to realtime publication
--  Without this, tenant never receives flag/approve updates live.
-- ─────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE kitchen_weeks;
ALTER PUBLICATION supabase_realtime ADD TABLE kitchen_comments;
