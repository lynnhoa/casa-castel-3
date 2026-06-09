-- ─────────────────────────────────────────────
--  CASA CASTEL — Kitchen Process Update
--  Run in Supabase SQL Editor
--  (Adds columns to existing kitchen_weeks table
--   and creates kitchen_absences table)
-- ─────────────────────────────────────────────

-- 1. Add new columns to kitchen_weeks
alter table kitchen_weeks
  add column if not exists photos          jsonb,        -- array of {type,path,url} — trash|geschirr|overview
  add column if not exists nudge_acknowledged boolean default false,
  add column if not exists peer_flagged    boolean default false,
  add column if not exists peer_flag_room  text,         -- which room raised the peer flag
  add column if not exists auto_approved_at timestamptz;

-- 2. kitchen_absences table
create table if not exists kitchen_absences (
  id               uuid primary key default gen_random_uuid(),
  room             text not null,
  from_date        date not null,
  to_date          date not null,
  checklist_done   boolean default false,
  departure_photos jsonb,                 -- array of {type,path,url}
  created_at       timestamptz default now()
);

alter publication supabase_realtime add table kitchen_absences;
alter table kitchen_absences enable row level security;

create policy "Public read absences"
  on kitchen_absences for select using (true);
create policy "Public insert absences"
  on kitchen_absences for insert with check (true);
create policy "Public update absences"
  on kitchen_absences for update using (true);
create policy "Public delete absences"
  on kitchen_absences for delete using (true);

-- 3. kitchen_nudges — anonymous house-wide nudges
--    (uses lounge_data with type='kitchen_nudge' — no new table needed)
--    type col already exists in lounge_data

-- 4. pg_cron: auto-miss Sunday 23:59 (enable pg_cron extension first if not active)
-- Run separately after enabling the extension:
-- select cron.schedule('auto-miss-kitchen','59 23 * * 0',
--   $$update kitchen_weeks set status='missed', closed_at=now()
--     where status='pending' and week_index = (
--       floor(extract(epoch from now() - '2026-06-01'::timestamptz)/604800)::int
--     )$$
-- );
