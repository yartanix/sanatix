-- Migration 021 built the "shared event unlocks messaging" gate and the
-- group chat, but never gave an ordinary attendee (as opposed to the
-- organizer, who already has bookings_read_as_organizer) a way to see
-- WHO else is attending -- bookings' own RLS only lets a user read their
-- own booking row. That's a real gap against the original ask ("users in
-- an event can see list of users joined the event"), so this closes it
-- with two narrow, qualification-gated RPCs rather than loosening
-- bookings' row-level policy itself (which would leak booking details --
-- quantity, payment_ref, qr_code -- that attendees have no business
-- seeing about each other).
--
-- Both functions return `directory_profiles` rows (never phone), and
-- both re-check the caller's own qualification before returning anyone
-- else's -- the same "organizer, live booking, or invite" / "host or
-- linked guest" checks join_event_group()/join_party_group() already use.

create or replace function get_event_attendees(p_event_id uuid)
returns setof directory_profiles
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  me uuid := auth.uid();
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

  return query
    select dp.* from directory_profiles dp
    where dp.id in (
      select organizer_id from events where id = p_event_id
      union
      select user_id from bookings where event_id = p_event_id and status <> 'cancelled'
      union
      select invited_user_id from event_invites where event_id = p_event_id
    )
    order by dp.full_name nulls last;
end;
$$;

grant execute on function get_event_attendees(uuid) to authenticated;

create or replace function get_party_members(p_party_id uuid)
returns setof directory_profiles
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  me uuid := auth.uid();
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

  return query
    select dp.* from directory_profiles dp
    where dp.id in (
      select host_id from parties where id = p_party_id
      union
      select user_id from party_guests where party_id = p_party_id and user_id is not null
    )
    order by dp.full_name nulls last;
end;
$$;

grant execute on function get_party_members(uuid) to authenticated;
