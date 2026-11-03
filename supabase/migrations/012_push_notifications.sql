-- Stores each logged-in user's Expo push token so the server can notify
-- them later — starting with "a guest just RSVP'd to your party" (see the
-- web app's /api/rsvp/[token] route). A user can have more than one
-- token (phone + tablet, or a reinstalled app getting a fresh token), so
-- this is a one-to-many table, not a column on auth.users.
--
-- Nothing here is guest-facing: only an authenticated host's own device
-- ever writes to it, and only trusted server code (the service-role
-- client, which bypasses RLS entirely) ever reads across users to find
-- out who to notify. There is deliberately no RLS policy letting one
-- user read another's push token.

create table if not exists push_tokens (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  expo_push_token   text not null,
  platform          text check (platform in ('ios', 'android')),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (expo_push_token)
);

create index if not exists push_tokens_user_id_idx on push_tokens(user_id);

alter table push_tokens enable row level security;

-- A user can register, see, and remove only their own device tokens.
-- Re-registering the same token (e.g. on every app launch) is a plain
-- upsert on the unique (expo_push_token) constraint — see the mobile
-- app's src/lib/push.ts.
drop policy if exists "users manage their own push tokens" on push_tokens;
create policy "users manage their own push tokens"
  on push_tokens for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
