-- ─────────────────────────────────────────────
--  CASA CASTEL — Lounge Data Table
--  Paste into Supabase SQL Editor → Run
--  (Kitchen tables already exist — do not re-run)
-- ─────────────────────────────────────────────

create table if not exists lounge_data (
  id         uuid primary key default gen_random_uuid(),
  type       text not null,        -- 'announcement' | 'notice' | 'message'
  room       text,                 -- sender room (null for announcement/notice)
  body       text not null,        -- message text or announcement body
  title      text,                 -- announcement title (optional)
  pinned     boolean default false,
  color      text,                 -- notice color: 'yellow' | 'green' | 'red'
  created_at timestamptz default now()
);

alter publication supabase_realtime add table lounge_data;

alter table lounge_data enable row level security;

create policy "Public read lounge"
  on lounge_data for select using (true);

create policy "Public insert lounge"
  on lounge_data for insert with check (true);

create policy "Public update lounge"
  on lounge_data for update using (true);

create policy "Public delete lounge"
  on lounge_data for delete using (true);
