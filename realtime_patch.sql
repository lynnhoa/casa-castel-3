-- ─────────────────────────────────────────────
--  CASA CASTEL — Realtime patch
--  Paste into Supabase SQL Editor → Run
--  Adds kitchen_weeks and kitchen_comments to
--  the realtime publication so live chat works.
-- ─────────────────────────────────────────────

alter publication supabase_realtime add table kitchen_weeks;
alter publication supabase_realtime add table kitchen_comments;
