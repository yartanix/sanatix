-- ============================================================
-- SANATIX — Migration 004
-- Fixes a real bug hit on the first live content-agent run: the
-- system account lookup in src/lib/agents/system-profile.ts searched
-- for an existing "Sanatix Content Agent" profile by full_name, and
-- only created a new auth.users account if that search came up
-- empty. That search depends on the (uncommitted, unverified —
-- see 04-Database.md) handle_new_user() trigger actually copying
-- user_metadata.full_name into profiles.full_name. Something
-- created an auth.users row for content-agent@sanatix.net without
-- the name-based lookup being able to find it again afterwards,
-- so every subsequent run hit Supabase's "email already
-- registered" error and failed outright.
--
-- Fix: stop relying on a search at all. Store the resolved profile
-- id directly the first time it's successfully created, and read
-- it back directly on every later run — no lookup, no ambiguity,
-- no dependency on trigger behavior we can't verify.
-- ============================================================

create table if not exists agent_config (
  key        text primary key,
  value      text not null,
  updated_at timestamptz not null default now()
);

alter table agent_config enable row level security;

-- Same access model as agent_runs: written/read via the service-role
-- key from cron routes; admins can read it directly for visibility.
create policy "agent_config_read_admin" on agent_config for select using (
  exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin')
);
