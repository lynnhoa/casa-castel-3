-- ─────────────────────────────────────────────────────────────
--  CASA CASTEL — ROOMS TABLE MIGRATION
--  supabase/migrations/003_rooms_columns.sql
--
--  1. Adds all new columns to rooms table
--  2. Inserts all 7 rooms (or updates if they already exist)
--  3. Enables realtime
--
--  Safe to run multiple times — uses ON CONFLICT DO UPDATE
--  Run in Supabase SQL Editor → Run
-- ─────────────────────────────────────────────────────────────

-- ── STEP 1: Add new columns ───────────────────────────────────
alter table rooms
  add column if not exists room_type             text not null default 'WG Zimmer',
  add column if not exists floor                 text not null default '',
  add column if not exists kitchen_type          text not null default 'Geteilte Küche',
  add column if not exists badezimmer            jsonb not null default '[]'::jsonb,
  add column if not exists mietvertrag_pricing   text not null default 'pauschal',
  add column if not exists mietvertrag_miete     numeric(8,2),
  add column if not exists kaltmiete             numeric(8,2),
  add column if not exists nk_pauschale          numeric(8,2),
  add column if not exists kaution_override      boolean not null default false,
  add column if not exists briefkastenschluessel int not null default 0,
  add column if not exists vacant                boolean not null default false,
  add column if not exists sort_order            int not null default 0;


-- ── STEP 2: Add unique constraint on name so ON CONFLICT works ─
-- (skip if already exists)
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'rooms_name_key'
  ) then
    alter table rooms add constraint rooms_name_key unique (name);
  end if;
end$$;


-- ── STEP 3: Upsert all 7 rooms ────────────────────────────────

insert into rooms (
  name, room_type, floor, flaeche_m2, kitchen_type,
  badezimmer, gemeinschaftsraeume,
  haustuerschluessel, zimmerschluessel, briefkastenschluessel,
  monatl_miete, kaution_default, mietvertrag_pricing,
  inventar, active, vacant, sort_order
) values
(
  'Paris', '2-Zimmer mit eigener Küche', 'Dachgeschoss', 28, 'Eigene Küche',
  '["Bad 2. OG"]'::jsonb,
  '["Terrasse","Garten","Vorgarten & Fahrradabstellplatz"]'::jsonb,
  1, 1, 0,
  null, null, 'pauschal',
  '[]'::jsonb, true, false, 0
),
(
  'Copenhagen', 'WG Zimmer', '1. OG', 12, 'Geteilte Küche',
  '["Bad 2. OG"]'::jsonb,
  '["Küche","Terrasse","Garten","Vorgarten & Fahrradabstellplatz"]'::jsonb,
  1, 1, 0,
  null, null, 'pauschal',
  '[]'::jsonb, true, false, 1
),
(
  'Stockholm', 'WG Zimmer', '1. OG', 16, 'Geteilte Küche',
  '["Bad 1. OG"]'::jsonb,
  '["Küche","Terrasse","Garten","Vorgarten & Fahrradabstellplatz"]'::jsonb,
  1, 1, 0,
  null, null, 'pauschal',
  '[]'::jsonb, true, false, 2
),
(
  'Oslo', 'WG Zimmer', '1. OG', 13, 'Geteilte Küche',
  '["Bad 2. OG"]'::jsonb,
  '["Küche","Terrasse","Garten","Vorgarten & Fahrradabstellplatz"]'::jsonb,
  1, 1, 0,
  null, null, 'pauschal',
  '[]'::jsonb, true, false, 3
),
(
  'London', 'WG Zimmer', 'EG', 25, 'Geteilte Küche',
  '["Bad 1. OG"]'::jsonb,
  '["Küche","Terrasse","Garten","Vorgarten & Fahrradabstellplatz"]'::jsonb,
  1, 1, 0,
  null, null, 'pauschal',
  '[]'::jsonb, true, false, 4
),
(
  'New York', 'Zimmer mit eigener Küche', 'UG', 16, 'Eigene Küche',
  '["Bad 1. OG"]'::jsonb,
  '["Terrasse","Garten","Vorgarten & Fahrradabstellplatz"]'::jsonb,
  1, 1, 0,
  null, null, 'pauschal',
  '[]'::jsonb, true, false, 5
),
(
  'Los Angeles', 'Zimmer mit eigener Küche', 'EG', 15, 'Eigene Küche',
  '["Bad 1. OG"]'::jsonb,
  '["Terrasse","Garten","Vorgarten & Fahrradabstellplatz"]'::jsonb,
  1, 1, 0,
  null, null, 'pauschal',
  '[]'::jsonb, true, false, 6
)
on conflict (name) do update set
  room_type             = excluded.room_type,
  floor                 = excluded.floor,
  flaeche_m2            = excluded.flaeche_m2,
  kitchen_type          = excluded.kitchen_type,
  badezimmer            = excluded.badezimmer,
  gemeinschaftsraeume   = excluded.gemeinschaftsraeume,
  haustuerschluessel    = excluded.haustuerschluessel,
  zimmerschluessel      = excluded.zimmerschluessel,
  briefkastenschluessel = excluded.briefkastenschluessel,
  sort_order            = excluded.sort_order
  -- note: monatl_miete, inventar NOT overwritten on conflict
  -- so existing rent/inventar data you've already entered is preserved


-- ── STEP 4: Enable realtime ───────────────────────────────────
-- (skip error if already added)
;
do $$
begin
  begin
    alter publication supabase_realtime add table rooms;
  exception when others then
    -- already a member, ignore
  end;
end$$;
