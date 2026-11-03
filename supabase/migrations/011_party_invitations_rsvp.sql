-- Lets any logged-in user host a party and invite guests (picked from
-- their phone contacts in the app, or typed in on web) with a personal
-- RSVP link each guest can open without ever needing an account. The
-- link is the guest's own unguessable uuid token — the actual
-- authorization boundary for a guest is "do you have this link", not a
-- login, same as any calendar-invite or wedding-RSVP-site pattern.
--
-- Per the chosen approach, nothing here auto-sends anything through
-- WhatsApp/Instagram/Snapchat/TikTok — the host shares each guest's link
-- through those apps' own native share sheet. This table only needs to
-- hold what the host typed in (name, optional phone for their own
-- reference) plus the RSVP state.

create table if not exists parties (
  id               uuid primary key default gen_random_uuid(),
  host_id          uuid not null references auth.users(id) on delete cascade,
  title            text not null,
  starts_at        timestamptz not null,
  location_name    text,
  location_address text,
  lat              double precision,
  lng              double precision,
  notes            text,
  cover_image      text,
  created_at       timestamptz not null default now()
);

create table if not exists party_guests (
  id            uuid primary key default gen_random_uuid(),
  party_id      uuid not null references parties(id) on delete cascade,
  name          text not null,
  phone         text,
  rsvp_token    uuid not null default gen_random_uuid(),
  rsvp_status   text not null default 'pending' check (rsvp_status in ('pending', 'yes', 'no', 'maybe')),
  guest_count   int not null default 1 check (guest_count >= 1 and guest_count <= 20),
  responded_at  timestamptz,
  created_at    timestamptz not null default now(),
  unique (rsvp_token)
);

create index if not exists parties_host_id_idx on parties(host_id);
create index if not exists party_guests_party_id_idx on party_guests(party_id);
create index if not exists party_guests_rsvp_token_idx on party_guests(rsvp_token);

alter table parties enable row level security;
alter table party_guests enable row level security;

-- Hosts can fully manage only their own parties and their own parties'
-- guest lists. There is deliberately no anon/public policy on either
-- table — the only way for an unauthenticated guest to reach their own
-- row is through the two token-gated functions below, which run as
-- security definer and return only the single matching row.

drop policy if exists "hosts manage their own parties" on parties;
create policy "hosts manage their own parties"
  on parties for all
  using (host_id = auth.uid())
  with check (host_id = auth.uid());

drop policy if exists "hosts manage their own party guests" on party_guests;
create policy "hosts manage their own party guests"
  on party_guests for all
  using (exists (select 1 from parties where parties.id = party_guests.party_id and parties.host_id = auth.uid()))
  with check (exists (select 1 from parties where parties.id = party_guests.party_id and parties.host_id = auth.uid()));

-- Public RSVP read: given a guest's own token, return just enough of the
-- party + that guest's row to render the RSVP page. security definer so
-- it can read across RLS, but it only ever returns one row matched by an
-- unguessable uuid — never a listing, never another guest's row.
create or replace function get_rsvp_details(token uuid)
returns table (
  party_id          uuid,
  title             text,
  starts_at         timestamptz,
  location_name     text,
  location_address  text,
  notes             text,
  cover_image       text,
  guest_name        text,
  guest_rsvp_status text,
  guest_count       int
)
language sql
security definer
set search_path = public
stable
as $$
  select p.id, p.title, p.starts_at, p.location_name, p.location_address, p.notes, p.cover_image,
         g.name, g.rsvp_status, g.guest_count
  from party_guests g
  join parties p on p.id = g.party_id
  where g.rsvp_token = token
$$;

grant execute on function get_rsvp_details(uuid) to anon, authenticated;

-- Public RSVP write: same token-gated shape — a guest can only ever
-- update the one row their own link points at.
create or replace function submit_rsvp(token uuid, new_status text, new_guest_count int default 1)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if new_status not in ('yes', 'no', 'maybe') then
    raise exception 'invalid rsvp status: %', new_status;
  end if;

  update party_guests
  set rsvp_status  = new_status,
      guest_count  = greatest(1, least(20, coalesce(new_guest_count, 1))),
      responded_at = now()
  where rsvp_token = token;

  if not found then
    raise exception 'invalid rsvp token';
  end if;
end;
$$;

grant execute on function submit_rsvp(uuid, text, int) to anon, authenticated;
