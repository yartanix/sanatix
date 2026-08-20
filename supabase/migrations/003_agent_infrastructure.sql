-- ============================================================
-- SANATIX — Migration 003
-- Infrastructure for autonomous background agents (content,
-- site-health, and future agents). Run this against project
-- fobrdnjicooekbrknojo after schema.sql and migration 002.
--
-- What this adds:
--   1. agent_runs — an observability log every agent writes to on
--      each run, so there's one place to see what an agent did,
--      whether it succeeded, and how much it created. Nothing in
--      this codebase reads agent behavior otherwise — without this,
--      an "autonomous" agent is a black box.
--   2. source_url / agent_generated on events and vendors — every
--      row an agent creates is tagged with where it came from and
--      that it *is* agent-created, so a human reviewing the draft
--      queue (or a future admin UI) can tell agent content apart
--      from organizer/vendor-submitted content and check the
--      source before publishing. Both columns are nullable /
--      default false, so this is fully additive and doesn't touch
--      any existing row or query.
-- ============================================================

-- ─── 1. Agent run log ──────────────────────────────────────────
create table if not exists agent_runs (
  id             uuid primary key default uuid_generate_v4(),
  agent_name     text not null,                 -- e.g. 'content-agent', 'health-agent'
  status         text not null default 'running' check (status in ('running','success','error')),
  started_at     timestamptz not null default now(),
  finished_at    timestamptz,
  items_created  integer not null default 0,
  items_skipped  integer not null default 0,
  summary        text,                           -- short human-readable summary of what happened
  error_message  text,
  metadata       jsonb                           -- free-form: search queries used, model, counts by type, etc.
);

create index if not exists idx_agent_runs_name_started on agent_runs(agent_name, started_at desc);

alter table agent_runs enable row level security;

-- No public read policy: agent_runs is written and read via the
-- service-role key only (cron routes, and later an admin dashboard).
-- Admins can read it once such a dashboard exists.
create policy "agent_runs_read_admin" on agent_runs for select using (
  exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin')
);

-- ─── 2. Provenance columns on agent-writable tables ────────────
alter table events  add column if not exists source_url      text;
alter table events  add column if not exists agent_generated boolean not null default false;
alter table vendors add column if not exists source_url      text;
alter table vendors add column if not exists agent_generated boolean not null default false;

create index if not exists idx_events_agent_generated  on events(agent_generated)  where agent_generated = true;
create index if not exists idx_vendors_agent_generated on vendors(agent_generated) where agent_generated = true;
