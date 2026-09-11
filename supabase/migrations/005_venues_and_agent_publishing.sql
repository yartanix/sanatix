-- ============================================================
-- SANATIX — Migration 005
-- Venues as a first-class entity + content-agent v2 support.
-- Run this against project fobrdnjicooekbrknojo after migrations
-- 002–004.
--
-- What this adds:
--   1. venues — a real table for halls, hotel ballrooms, arenas,
--      conference centers, outdoor grounds, etc. Until now a venue
--      only existed as free text on events (venue_name/venue_city)
--      or as a vendor row with category = 'venue'. The content
--      agent v2 discovers venues per city and publishes them here.
--   2. events.venue_id — nullable FK to venues. The agent links
--      events it finds to a known venue when the names match;
--      organizers can pick one in a later UI. venue_name stays as
--      the display fallback so nothing existing changes.
--   3. venues.is_published — agent-sourced venues are published
--      immediately (product decision, Sep 2026: the agent feeds the
--      site directly; humans can unpublish rather than approve).
--   4. Provenance columns (source_url, agent_generated) on venues,
--      mirroring migration 003 on events/vendors.
-- ============================================================

-- ─── 1. Venues ─────────────────────────────────────────────────
create table if not exists venues (
  id              uuid primary key default uuid_generate_v4(),
  name_ar         text not null,
  name_en         text not null,
  aliases         text[] not null default '{}',   -- alternate spellings the agent should match on
  description_ar  text,
  description_en  text,
  venue_type      text not null default 'other' check (venue_type in (
                    'hotel','ballroom','hall','conference_center','arena',
                    'stadium','theater','outdoor','restaurant','cultural',
                    'exhibition_center','other'
                  )),
  city            text not null,
  country         text not null default 'SA',
  address         text,
  lat             double precision,
  lng             double precision,
  capacity_min    integer,
  capacity_max    integer,
  cover_image     text,
  images          text[] not null default '{}',
  amenities       text[] not null default '{}',
  website_url     text,
  instagram_url   text,
  google_maps_url text,
  phone           text,
  whatsapp        text,
  email           text,
  price_range     text,                            -- free text like "SAR 15,000–40,000 / night"
  is_published    boolean not null default false,
  is_featured     boolean not null default false,
  rating          numeric(3,2),
  review_count    integer not null default 0,
  view_count      integer not null default 0,
  created_by      uuid references profiles(id) on delete set null,
  source_url      text,
  agent_generated boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- One venue per (name, city), case-insensitive. The agent also dedups in
-- application code (against aliases), but this is the hard backstop.
create unique index if not exists uq_venues_name_city
  on venues (lower(name_en), lower(city));

create index if not exists idx_venues_city         on venues(city);
create index if not exists idx_venues_type         on venues(venue_type);
create index if not exists idx_venues_published    on venues(is_published) where is_published = true;
create index if not exists idx_venues_agent        on venues(agent_generated) where agent_generated = true;

alter table venues enable row level security;

create policy "venues_read_published" on venues for select using (is_published = true);
create policy "venues_read_admin"     on venues for select using (
  exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin')
);
create policy "venues_manage_admin"   on venues for all using (
  exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin')
);
-- Inserts/updates from the content agent go through the service-role key
-- (createAdminClient), which bypasses RLS — no extra policy needed.

-- keep updated_at fresh
create or replace function set_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_venues_updated_at on venues;
create trigger trg_venues_updated_at before update on venues
  for each row execute function set_updated_at();

-- ─── 2. Link events to venues ──────────────────────────────────
alter table events add column if not exists venue_id uuid references venues(id) on delete set null;
create index if not exists idx_events_venue on events(venue_id);

-- External ticketing link for agent-sourced events (tickets are sold on
-- webook / Platinumlist / the organizer's site, not through Sanatix yet).
-- The event page shows a "Get tickets" button to this URL when the event
-- has no ticket_types of its own.
alter table events add column if not exists ticket_url text;

-- ─── 3. Agent v2 bookkeeping ───────────────────────────────────
-- Fast lookups for the agent's dedup window (same city, ±2 days).
create index if not exists idx_events_city_starts on events(venue_city, starts_at);
