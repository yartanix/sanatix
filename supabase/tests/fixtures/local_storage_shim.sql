-- Minimal stand-in for Supabase's storage schema (storage.buckets,
-- storage.objects, storage.foldername) so migrations that create a
-- bucket + object-level RLS policies can be loaded and exercised
-- against a local, disposable Postgres. Not a real implementation of
-- Supabase Storage (no actual file bytes move anywhere) -- it exists
-- only so the RLS policies on storage.objects can be tested the same
-- way the real project enforces them.
--
-- Never load this into a real database -- see supabase/tests/README.md.

create schema if not exists storage;

create table if not exists storage.buckets (
  id     text primary key,
  name   text not null,
  public boolean not null default false
);

create table if not exists storage.objects (
  id            uuid primary key default gen_random_uuid(),
  bucket_id     text not null references storage.buckets(id),
  name          text not null,
  owner         uuid,
  created_at    timestamptz not null default now()
);

alter table storage.objects enable row level security;

-- Real Supabase Storage splits an object's "name" (e.g.
-- "conversation-id/file.jpg") on "/" into path segments; this is a
-- small stand-in for that, sufficient for a policy that reads just
-- the first segment.
create or replace function storage.foldername(name text) returns text[]
language sql immutable as $$
  select string_to_array(name, '/')
$$;

grant usage on schema storage to anon, authenticated;
grant select, insert, update, delete on storage.buckets, storage.objects to anon, authenticated;
