-- ============================================================
-- SANATIX — Migration 021
-- Community: a public directory of Sanatix accounts, direct
-- messages, a per-event/per-party group chat for people who
-- actually share that event, and the block/report mechanism a
-- consumer messaging feature on a family/kids-party platform
-- cannot ship without.
--
-- Deliberate safety-by-design choices, made explicitly with the
-- founder before writing this (not assumptions):
--
--   1. The directory (who shows up in a "Sanatix users" list) is
--      open — profiles.* is already publicly readable
--      (profiles_read_all, schema.sql) and stays that way. This
--      migration adds directory_profiles, a narrower VIEW the app
--      is expected to use for browsing/searching instead of
--      selecting profiles directly, so a directory listing never
--      pulls phone numbers even though the base table's own RLS
--      already permits it.
--
--   2. Sending a first message to someone is NOT open the same
--      way. users_share_event() is the one gate every DM start
--      goes through: you can only message someone you share an
--      event with — both attended/organize the same ticketed
--      event (a confirmed, non-cancelled booking, or the
--      organizer), the same event via an explicit organizer
--      invite (event_invites), or the same party (host + a guest
--      the host linked to their own Sanatix account). This is the
--      harassment/cold-contact guard: browsing the directory never
--      by itself unlocks messaging anyone in it.
--
--   3. Blocking and reporting ship in this same migration, not as
--      a follow-up — block_user()/unblock_user() and
--      report_content() exist before any DM or group chat UI is
--      wired up, and a block is enforced at the RLS layer on
--      message INSERT (defense in depth below the RPCs), not only
--      in application code.
--
-- Everything here follows the same conventions already established
-- in this schema: SECURITY DEFINER functions set
-- search_path = public, pg_temp (019); privileged/trusted writes
-- go through a function rather than a raw table policy wherever a
-- cross-user check is needed (011, 015, 017); is_admin_user() and
-- is_privileged_db_role() (013) are reused rather than redefined.
-- ============================================================

-- ─── 1. Directory: a narrow, explicitly-safe view over profiles ───
-- profiles itself is already selectable by anyone (profiles_read_all).
-- This view exists so the app's directory/search code has one place
-- that can never leak phone, even if that base-table policy ever
-- changes shape — it is the only thing the Community UI should query.
create or replace view directory_profiles
  with (security_invoker = true)
as
  select id, full_name, avatar_url, city, role, created_at
  from profiles;

grant select on directory_profiles to authenticated;

-- Simple ILIKE search over the view, capped, for the directory's
-- search box. Not SECURITY DEFINER — it only ever reads what the
-- view itself already exposes to any authenticated caller.
create or replace function search_directory(q text default null, limit_n int default 50)
returns setof directory_profiles
language sql
stable
as $$
  select * from directory_profiles
  where q is null or trim(q) = '' or full_name ilike '%' || trim(q) || '%'
  order by full_name nulls last
  limit greatest(1, least(coalesce(limit_n, 50), 100))
$$;

grant execute on function search_directory(text, int) to authenticated;

-- ─── 2. party_guests: optional link to a Sanatix account ──────────
-- A guest is still just name+phone+token by default (migration 011
-- — no account needed to RSVP). This column lets a guest who IS a
-- Sanatix account be tied to it, either because the host added them
-- straight from the directory (add_party_guest_by_user(), below) or
-- because they RSVP'd while signed in. It is what lets a party's
-- group chat and "shared event" check recognize them.
alter table party_guests
  add column if not exists user_id uuid references profiles(id) on delete set null;

create index if not exists party_guests_user_id_idx on party_guests(user_id);

-- submit_rsvp() already exists (migration 015) and runs as the
-- unauthenticated/token-gated path — it deliberately never touches
-- user_id. A signed-in guest is linked only through
-- link_rsvp_to_self(), an explicit, narrow action: the caller must
-- already know that guest's own rsvp_token (the same bearer-link
-- model every other RSVP action uses), and it only ever sets a
-- currently-null user_id to the caller's own id — never anyone
-- else's, never overwriting an existing link.
create or replace function link_rsvp_to_self(token uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'must be signed in';
  end if;

  update party_guests
  set user_id = auth.uid()
  where rsvp_token = token
    and user_id is null;

  if not found then
    raise exception 'invalid rsvp token, or already linked';
  end if;
end;
$$;

grant execute on function link_rsvp_to_self(uuid) to authenticated;

-- A host adding a guest they already found in the directory: skips
-- the "no account" path entirely — the guest is marked attending
-- immediately (the host vouching for them, same trust level as
-- adding anyone else to their own guest list) and is immediately a
-- member of the party's group chat via the trigger in section 6.
create or replace function add_party_guest_by_user(p_party_id uuid, p_user_id uuid)
returns party_guests
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  g party_guests;
  guest_name text;
begin
  if not exists (select 1 from parties where id = p_party_id and host_id = auth.uid()) then
    raise exception 'party not found';
  end if;

  -- A profile existing is the real check -- full_name itself is
  -- nullable (handle_new_user only sets it from signup metadata that
  -- may be absent), so checking "is full_name null" instead of "does
  -- the row exist" would wrongly reject a perfectly real Sanatix user
  -- who just hasn't set a display name yet.
  if not exists (select 1 from profiles where id = p_user_id) then
    raise exception 'user not found';
  end if;
  select coalesce(full_name, 'Sanatix user') into guest_name from profiles where id = p_user_id;

  insert into party_guests (party_id, name, user_id, rsvp_status, responded_at)
  values (p_party_id, guest_name, p_user_id, 'yes', now())
  returning * into g;

  return g;
end;
$$;

grant execute on function add_party_guest_by_user(uuid, uuid) to authenticated;

-- ─── 3. event_invites: a lightweight, non-ticket invite ───────────
-- Separate from booking a ticket. An organizer can directly invite a
-- specific Sanatix account to an event — it grants "shared event"
-- status (so they can be messaged / join the event's group chat) but
-- is not a booking and implies no payment or admission right beyond
-- whatever the event itself already grants.
create table if not exists event_invites (
  event_id        uuid not null references events(id) on delete cascade,
  invited_user_id uuid not null references profiles(id) on delete cascade,
  invited_by      uuid not null references profiles(id),
  created_at      timestamptz not null default now(),
  primary key (event_id, invited_user_id)
);

create index if not exists event_invites_user_idx on event_invites(invited_user_id);

alter table event_invites enable row level security;

drop policy if exists "event_invites_read" on event_invites;
create policy "event_invites_read" on event_invites for select using (
  invited_user_id = auth.uid()
  or invited_by = auth.uid()
  or exists (select 1 from events where events.id = event_invites.event_id and events.organizer_id = auth.uid())
);

drop policy if exists "event_invites_organizer_manage" on event_invites;
create policy "event_invites_organizer_manage" on event_invites for all using (
  exists (select 1 from events where events.id = event_invites.event_id and events.organizer_id = auth.uid())
) with check (
  exists (select 1 from events where events.id = event_invites.event_id and events.organizer_id = auth.uid())
);

-- Wraps the insert so the organizer check happens even for a client
-- that only has anon/authenticated RLS and also ensures the event's
-- group conversation exists and the invited user is in it right
-- away, rather than waiting on them to ever get a booking.
create or replace function add_event_invite(p_event_id uuid, p_user_id uuid)
returns event_invites
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  row_out event_invites;
  conv_id uuid;
begin
  if not exists (select 1 from events where id = p_event_id and organizer_id = auth.uid()) then
    raise exception 'event not found';
  end if;

  insert into event_invites (event_id, invited_user_id, invited_by)
  values (p_event_id, p_user_id, auth.uid())
  on conflict (event_id, invited_user_id) do nothing
  returning * into row_out;

  if row_out is null then
    select * into row_out from event_invites where event_id = p_event_id and invited_user_id = p_user_id;
  end if;

  conv_id := ensure_event_group(p_event_id);
  insert into conversation_participants (conversation_id, user_id)
  values (conv_id, p_user_id)
  on conflict do nothing;

  return row_out;
end;
$$;

-- (granted below, after ensure_event_group exists)

-- ─── 4. Blocks ──────────────────────────────────────────────────
create table if not exists blocks (
  blocker_id uuid not null references profiles(id) on delete cascade,
  blocked_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint blocks_not_self check (blocker_id <> blocked_id)
);

alter table blocks enable row level security;

-- Deliberately one-directional visibility: you can see who *you*
-- blocked, never who blocked *you* — telling someone they've been
-- blocked is its own harassment vector.
drop policy if exists "blocks_read_own" on blocks;
create policy "blocks_read_own" on blocks for select using (blocker_id = auth.uid());

drop policy if exists "blocks_insert_own" on blocks;
create policy "blocks_insert_own" on blocks for insert with check (blocker_id = auth.uid());

drop policy if exists "blocks_delete_own" on blocks;
create policy "blocks_delete_own" on blocks for delete using (blocker_id = auth.uid());

create or replace function block_user(p_user_id uuid)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  insert into blocks (blocker_id, blocked_id) values (auth.uid(), p_user_id)
  on conflict do nothing;
$$;

create or replace function unblock_user(p_user_id uuid)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  delete from blocks where blocker_id = auth.uid() and blocked_id = p_user_id;
$$;

grant execute on function block_user(uuid) to authenticated;
grant execute on function unblock_user(uuid) to authenticated;

create or replace function is_blocked_either_way(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (select 1 from blocks where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a));
$$;

-- ─── 5. Reports ─────────────────────────────────────────────────
create table if not exists reports (
  id          uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references profiles(id),
  target_type text not null check (target_type in ('user', 'message')),
  target_id   uuid not null,
  reason      text not null check (length(trim(reason)) > 0),
  status      text not null default 'open' check (status in ('open', 'reviewed', 'dismissed')),
  created_at  timestamptz not null default now()
);

create index if not exists reports_status_idx on reports(status);

alter table reports enable row level security;

drop policy if exists "reports_read" on reports;
create policy "reports_read" on reports for select using (reporter_id = auth.uid() or is_admin_user());

drop policy if exists "reports_insert_own" on reports;
create policy "reports_insert_own" on reports for insert with check (reporter_id = auth.uid());

drop policy if exists "reports_admin_update" on reports;
create policy "reports_admin_update" on reports for update using (is_admin_user());

create or replace function report_content(p_target_type text, p_target_id uuid, p_reason text)
returns reports
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  row_out reports;
begin
  if p_target_type not in ('user', 'message') then
    raise exception 'invalid report target_type: %', p_target_type;
  end if;
  if coalesce(trim(p_reason), '') = '' then
    raise exception 'a reason is required';
  end if;

  insert into reports (reporter_id, target_type, target_id, reason)
  values (auth.uid(), p_target_type, p_target_id, trim(p_reason))
  returning * into row_out;

  return row_out;
end;
$$;

grant execute on function report_content(text, uuid, text) to authenticated;

-- ─── 6. Conversations, participants, messages ──────────────────────
create table if not exists conversations (
  id          uuid primary key default gen_random_uuid(),
  kind        text not null check (kind in ('dm', 'event_group', 'party_group')),
  source_id   uuid,              -- event_id or party_id for a group conversation, null for a dm
  dm_user_a   uuid references profiles(id) on delete cascade,  -- dm only, dm_user_a < dm_user_b
  dm_user_b   uuid references profiles(id) on delete cascade,  -- (sorted so the pair is unique regardless of who started it)
  created_at  timestamptz not null default now(),
  constraint conversations_dm_shape check (
    (kind = 'dm' and source_id is null and dm_user_a is not null and dm_user_b is not null and dm_user_a < dm_user_b)
    or (kind in ('event_group', 'party_group') and source_id is not null and dm_user_a is null and dm_user_b is null)
  )
);

create unique index if not exists conversations_dm_pair_idx on conversations(dm_user_a, dm_user_b) where kind = 'dm';
create unique index if not exists conversations_group_idx on conversations(kind, source_id) where kind in ('event_group', 'party_group');

create table if not exists conversation_participants (
  conversation_id uuid not null references conversations(id) on delete cascade,
  user_id         uuid not null references profiles(id) on delete cascade,
  joined_at       timestamptz not null default now(),
  last_read_at    timestamptz,
  primary key (conversation_id, user_id)
);

create index if not exists conversation_participants_user_idx on conversation_participants(user_id);

create table if not exists messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_id       uuid not null references profiles(id),
  body            text,
  image_path      text,  -- object path in the chat-media storage bucket
  created_at      timestamptz not null default now(),
  constraint messages_has_content check (coalesce(trim(body), '') <> '' or image_path is not null)
);

create index if not exists messages_conversation_idx on messages(conversation_id, created_at);

alter table conversations enable row level security;
alter table conversation_participants enable row level security;
alter table messages enable row level security;

-- No direct insert/update/delete policy on conversations — every row
-- is created by a SECURITY DEFINER function below (start_or_get_dm,
-- ensure_event_group, ensure_party_group), same pattern as
-- get_rsvp_details/submit_rsvp (011) already uses for parties.
drop policy if exists "conversations_read_participant" on conversations;
create policy "conversations_read_participant" on conversations for select using (
  exists (select 1 from conversation_participants cp where cp.conversation_id = conversations.id and cp.user_id = auth.uid())
);

-- A plain "exists (select 1 from conversation_participants self where ...)"
-- USING clause on conversation_participants' OWN select policy is
-- self-referential: evaluating the policy re-triggers the same policy
-- on the inner query, forever ("infinite recursion detected in policy
-- for relation conversation_participants"). A SECURITY DEFINER
-- function run by the table owner bypasses RLS on its own queries
-- (these tables have no FORCE ROW LEVEL SECURITY), which breaks the
-- cycle; every other policy in this migration that checks conversation
-- membership from a different table already avoids this because it
-- isn't checking itself.
create or replace function is_conversation_participant(p_conversation_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from conversation_participants
    where conversation_id = p_conversation_id and user_id = p_user_id
  )
$$;

drop policy if exists "conversation_participants_read" on conversation_participants;
create policy "conversation_participants_read" on conversation_participants for select using (
  is_conversation_participant(conversation_participants.conversation_id, auth.uid())
);

-- A participant may mark their own membership row read — nothing
-- else on it (joined_at, which conversation, which user, are all
-- locked down by the trigger below).
drop policy if exists "conversation_participants_update_own" on conversation_participants;
create policy "conversation_participants_update_own" on conversation_participants for update using (
  user_id = auth.uid()
) with check (
  user_id = auth.uid()
);

create or replace function enforce_participant_field_protection() returns trigger
language plpgsql as $$
begin
  if is_privileged_db_role() then
    return new;
  end if;
  if new.conversation_id is distinct from old.conversation_id
     or new.user_id is distinct from old.user_id
     or new.joined_at is distinct from old.joined_at then
    raise exception 'only last_read_at can be changed on a conversation_participants row';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_participant_field_protection on conversation_participants;
create trigger trg_enforce_participant_field_protection
  before update on conversation_participants
  for each row execute function enforce_participant_field_protection();

drop policy if exists "messages_read_participant" on messages;
create policy "messages_read_participant" on messages for select using (
  exists (select 1 from conversation_participants cp where cp.conversation_id = messages.conversation_id and cp.user_id = auth.uid())
);

-- Defense in depth below send_message(): a direct PostgREST insert
-- has to pass the exact same participant + not-blocked check the RPC
-- enforces.
drop policy if exists "messages_insert_participant" on messages;
create policy "messages_insert_participant" on messages for insert with check (
  sender_id = auth.uid()
  and exists (select 1 from conversation_participants cp where cp.conversation_id = messages.conversation_id and cp.user_id = auth.uid())
  and not exists (
    select 1
    from conversations c
    join conversation_participants other
      on other.conversation_id = c.id and other.user_id <> auth.uid()
    where c.id = messages.conversation_id
      and c.kind = 'dm'
      and is_blocked_either_way(auth.uid(), other.user_id)
  )
);

-- A sender may delete (unsend) their own message; an admin may
-- remove any message acted on through the report queue. No update
-- policy at all — messages are immutable once sent.
drop policy if exists "messages_delete_own_or_admin" on messages;
create policy "messages_delete_own_or_admin" on messages for delete using (
  sender_id = auth.uid() or is_admin_user()
);

-- ─── 7. users_share_event(): the one gate every DM start goes through ───
create or replace function users_share_event(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    a <> b
    and (
      -- a attends an event b organizes, or vice versa
      exists (
        select 1 from bookings bk join events e on e.id = bk.event_id
        where bk.status <> 'cancelled'
          and ((bk.user_id = a and e.organizer_id = b) or (bk.user_id = b and e.organizer_id = a))
      )
      -- a and b both have a live booking on the same event
      or exists (
        select 1
        from bookings b1
        join bookings b2 on b1.event_id = b2.event_id
        where b1.user_id = a and b2.user_id = b
          and b1.status <> 'cancelled' and b2.status <> 'cancelled'
      )
      -- a is invited to an event b organizes, or vice versa
      or exists (
        select 1 from event_invites ei join events e on e.id = ei.event_id
        where (ei.invited_user_id = a and e.organizer_id = b) or (ei.invited_user_id = b and e.organizer_id = a)
      )
      -- a and b are both invited to the same event
      or exists (
        select 1 from event_invites i1 join event_invites i2 on i1.event_id = i2.event_id
        where i1.invited_user_id = a and i2.invited_user_id = b
      )
      -- a hosts a party b is a linked guest of, or vice versa
      or exists (
        select 1 from parties p join party_guests g on g.party_id = p.id
        where g.user_id is not null
          and ((p.host_id = a and g.user_id = b) or (p.host_id = b and g.user_id = a))
      )
      -- a and b are both linked guests of the same party
      or exists (
        select 1 from party_guests g1 join party_guests g2 on g1.party_id = g2.party_id
        where g1.user_id = a and g2.user_id = b
      )
    )
$$;

-- ─── 8. DM start ────────────────────────────────────────────────
create or replace function start_or_get_dm(p_other_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  me uuid := auth.uid();
  a uuid;
  b uuid;
  conv_id uuid;
begin
  if me is null then
    raise exception 'must be signed in';
  end if;
  if p_other_user_id is null or p_other_user_id = me then
    raise exception 'invalid recipient';
  end if;
  if is_blocked_either_way(me, p_other_user_id) then
    raise exception 'cannot message this user';
  end if;
  if not users_share_event(me, p_other_user_id) then
    raise exception 'NO_SHARED_EVENT' using hint = 'You can only message someone you share an event or party with.';
  end if;

  a := least(me, p_other_user_id);
  b := greatest(me, p_other_user_id);

  select id into conv_id from conversations where kind = 'dm' and dm_user_a = a and dm_user_b = b;

  if conv_id is null then
    insert into conversations (kind, dm_user_a, dm_user_b) values ('dm', a, b)
    on conflict (dm_user_a, dm_user_b) where kind = 'dm' do nothing
    returning id into conv_id;

    if conv_id is null then
      select id into conv_id from conversations where kind = 'dm' and dm_user_a = a and dm_user_b = b;
    end if;

    insert into conversation_participants (conversation_id, user_id) values (conv_id, a) on conflict do nothing;
    insert into conversation_participants (conversation_id, user_id) values (conv_id, b) on conflict do nothing;
  end if;

  return conv_id;
end;
$$;

grant execute on function start_or_get_dm(uuid) to authenticated;

-- ─── 9. Event / party group conversations ──────────────────────
create or replace function ensure_event_group(p_event_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  conv_id uuid;
  organizer uuid;
begin
  select organizer_id into organizer from events where id = p_event_id;
  if organizer is null then
    raise exception 'event not found';
  end if;

  select id into conv_id from conversations where kind = 'event_group' and source_id = p_event_id;
  if conv_id is null then
    insert into conversations (kind, source_id) values ('event_group', p_event_id)
    on conflict (kind, source_id) where kind in ('event_group', 'party_group') do nothing
    returning id into conv_id;

    if conv_id is null then
      select id into conv_id from conversations where kind = 'event_group' and source_id = p_event_id;
    end if;

    insert into conversation_participants (conversation_id, user_id) values (conv_id, organizer) on conflict do nothing;
  end if;

  return conv_id;
end;
$$;

-- ensure_event_group() itself is intentionally not granted to
-- authenticated/anon — it only creates the row and seats the
-- organizer, with no check on who's calling. join_event_group()
-- below is the guarded entry point a regular user actually calls;
-- add_event_invite() (an organizer-only action) also calls it
-- directly as the function owner, which needs no grant.
grant execute on function add_event_invite(uuid, uuid) to authenticated;

-- A caller may only *join* the event group they already qualify for
-- (organizer, a live booking, or an explicit invite) — ensure_event_group()
-- alone does not add the caller, this does, and checks first.
create or replace function join_event_group(p_event_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  me uuid := auth.uid();
  conv_id uuid;
  qualifies boolean;
begin
  if me is null then
    raise exception 'must be signed in';
  end if;

  select
    exists (select 1 from events where id = p_event_id and organizer_id = me)
    or exists (select 1 from bookings where event_id = p_event_id and user_id = me and status <> 'cancelled')
    or exists (select 1 from event_invites where event_id = p_event_id and invited_user_id = me)
  into qualifies;

  if not qualifies then
    raise exception 'not a participant of this event';
  end if;

  conv_id := ensure_event_group(p_event_id);
  insert into conversation_participants (conversation_id, user_id) values (conv_id, me) on conflict do nothing;
  return conv_id;
end;
$$;

grant execute on function join_event_group(uuid) to authenticated;

create or replace function ensure_party_group(p_party_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  conv_id uuid;
  host uuid;
begin
  select host_id into host from parties where id = p_party_id;
  if host is null then
    raise exception 'party not found';
  end if;

  select id into conv_id from conversations where kind = 'party_group' and source_id = p_party_id;
  if conv_id is null then
    insert into conversations (kind, source_id) values ('party_group', p_party_id)
    on conflict (kind, source_id) where kind in ('event_group', 'party_group') do nothing
    returning id into conv_id;

    if conv_id is null then
      select id into conv_id from conversations where kind = 'party_group' and source_id = p_party_id;
    end if;

    insert into conversation_participants (conversation_id, user_id) values (conv_id, host) on conflict do nothing;
  end if;

  return conv_id;
end;
$$;

create or replace function join_party_group(p_party_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  me uuid := auth.uid();
  conv_id uuid;
  qualifies boolean;
begin
  if me is null then
    raise exception 'must be signed in';
  end if;

  select
    exists (select 1 from parties where id = p_party_id and host_id = me)
    or exists (select 1 from party_guests where party_id = p_party_id and user_id = me)
  into qualifies;

  if not qualifies then
    raise exception 'not a participant of this party';
  end if;

  conv_id := ensure_party_group(p_party_id);
  insert into conversation_participants (conversation_id, user_id) values (conv_id, me) on conflict do nothing;
  return conv_id;
end;
$$;

grant execute on function join_party_group(uuid) to authenticated;

-- ─── 10. send_message(): the supported write path ───────────────
-- Thin wrapper over the insert the RLS policy above already allows
-- directly — exists so the app has one call that returns the full
-- inserted row and so the NO_SHARED_EVENT-style error message stays
-- consistent, rather than a raw RLS "new row violates policy".
create or replace function send_message(p_conversation_id uuid, p_body text default null, p_image_path text default null)
returns messages
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  me uuid := auth.uid();
  row_out messages;
begin
  if me is null then
    raise exception 'must be signed in';
  end if;
  if coalesce(trim(p_body), '') = '' and p_image_path is null then
    raise exception 'a message needs text or an image';
  end if;
  if not exists (select 1 from conversation_participants where conversation_id = p_conversation_id and user_id = me) then
    raise exception 'not a participant of this conversation';
  end if;
  if exists (
    select 1 from conversations c
    join conversation_participants other on other.conversation_id = c.id and other.user_id <> me
    where c.id = p_conversation_id and c.kind = 'dm' and is_blocked_either_way(me, other.user_id)
  ) then
    raise exception 'cannot message this user';
  end if;

  insert into messages (conversation_id, sender_id, body, image_path)
  values (p_conversation_id, me, nullif(trim(p_body), ''), p_image_path)
  returning * into row_out;

  return row_out;
end;
$$;

grant execute on function send_message(uuid, text, text) to authenticated;

-- ─── 11. Auto-membership triggers ────────────────────────────────
-- A confirmed booking puts its owner straight into that event's
-- group chat — no separate "join" tap needed for the common case.
create or replace function trg_bookings_join_event_group() returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  conv_id uuid;
  became_confirmed boolean;
begin
  if tg_op = 'INSERT' then
    became_confirmed := (new.status = 'confirmed');
  else
    became_confirmed := (new.status = 'confirmed' and old.status is distinct from 'confirmed');
  end if;

  if became_confirmed then
    conv_id := ensure_event_group(new.event_id);
    insert into conversation_participants (conversation_id, user_id) values (conv_id, new.user_id) on conflict do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_bookings_join_event_group on bookings;
create trigger trg_bookings_join_event_group
  after insert or update of status on bookings
  for each row execute function trg_bookings_join_event_group();

-- A party guest who is both linked to a Sanatix account and RSVP'd
-- "yes" joins that party's group chat automatically.
create or replace function trg_party_guests_join_party_group() returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  conv_id uuid;
begin
  if new.user_id is not null and new.rsvp_status = 'yes' then
    conv_id := ensure_party_group(new.party_id);
    insert into conversation_participants (conversation_id, user_id) values (conv_id, new.user_id) on conflict do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_party_guests_join_party_group on party_guests;
create trigger trg_party_guests_join_party_group
  after insert or update of user_id, rsvp_status on party_guests
  for each row execute function trg_party_guests_join_party_group();

-- ─── 12. chat-media storage bucket ───────────────────────────────
-- Private bucket; objects are stored as "<conversation_id>/<file>",
-- and access is scoped to that conversation's own participants —
-- mirrors the RLS shape used everywhere else in this migration.
insert into storage.buckets (id, name, public)
values ('chat-media', 'chat-media', false)
on conflict (id) do nothing;

drop policy if exists "chat_media_read_participant" on storage.objects;
create policy "chat_media_read_participant" on storage.objects for select using (
  bucket_id = 'chat-media'
  and exists (
    select 1 from conversation_participants cp
    where cp.user_id = auth.uid()
      and cp.conversation_id::text = (storage.foldername(name))[1]
  )
);

drop policy if exists "chat_media_write_participant" on storage.objects;
create policy "chat_media_write_participant" on storage.objects for insert with check (
  bucket_id = 'chat-media'
  and exists (
    select 1 from conversation_participants cp
    where cp.user_id = auth.uid()
      and cp.conversation_id::text = (storage.foldername(name))[1]
  )
);

drop policy if exists "chat_media_delete_own" on storage.objects;
create policy "chat_media_delete_own" on storage.objects for delete using (
  bucket_id = 'chat-media' and owner = auth.uid()
);
