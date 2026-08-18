-- ============================================================
-- SANATIX — Migration 002
-- Adds what Phase 3's organizer API needs that schema.sql (v1.0)
-- didn't grant yet:
--   1. Organizers can manage (insert/update/delete) ticket_types
--      for events they own — schema.sql only had a public "read
--      published events' ticket types" policy, so the new
--      /api/organizer/events/[id]/tickets routes would otherwise
--      fail with a silent RLS permission denial.
--   2. Organizers can read bookings for their own events — needed
--      by /api/organizer/events/[id]/attendees. Previously bookings
--      were only readable by the booking's own user.
--   3. create_bookings(): an atomic RPC that replaces the old
--      client-side "insert into bookings" call in TicketSelector.tsx.
--      That call never checked remaining stock or incremented
--      ticket_types.sold_quantity, so two people could both "buy"
--      the last ticket, and sold-out counts were never accurate.
--      This function locks each ticket_type row (SELECT ... FOR
--      UPDATE), validates status/capacity, updates sold_quantity,
--      and inserts the booking(s) in a single transaction.
--
-- Run this in the Supabase SQL editor (or via the CLI) against
-- project fobrdnjicooekbrknojo after schema.sql.
-- ============================================================

-- ─── 1. Ticket types: organizers manage their own event's tickets ─
create policy "ticket_types_manage_own" on ticket_types for all using (
  exists (
    select 1 from events
    where events.id = ticket_types.event_id
      and events.organizer_id = auth.uid()
  )
) with check (
  exists (
    select 1 from events
    where events.id = ticket_types.event_id
      and events.organizer_id = auth.uid()
  )
);

-- ─── 2. Bookings: organizers can read bookings for their own events ─
create policy "bookings_read_as_organizer" on bookings for select using (
  exists (
    select 1 from events
    where events.id = bookings.event_id
      and events.organizer_id = auth.uid()
  )
);

-- ─── 3. Atomic multi-item booking RPC ──────────────────────────
create or replace function create_bookings(items jsonb)
returns setof bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id        uuid := auth.uid();
  v_item           jsonb;
  v_ticket_type_id uuid;
  v_quantity       integer;
  v_ticket         ticket_types%rowtype;
  v_event_status   event_status;
  v_booking        bookings%rowtype;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if items is null or jsonb_typeof(items) <> 'array' or jsonb_array_length(items) = 0 then
    raise exception 'No items to book';
  end if;

  for v_item in select * from jsonb_array_elements(items)
  loop
    v_ticket_type_id := (v_item->>'ticket_type_id')::uuid;
    v_quantity        := (v_item->>'quantity')::integer;

    if v_quantity is null or v_quantity < 1 or v_quantity > 10 then
      raise exception 'Invalid quantity for ticket type %', v_ticket_type_id;
    end if;

    -- Row lock serializes concurrent bookings against the same ticket type.
    select * into v_ticket from ticket_types where id = v_ticket_type_id for update;
    if not found then
      raise exception 'Ticket type % not found', v_ticket_type_id;
    end if;

    select status into v_event_status from events where id = v_ticket.event_id;
    if v_event_status is distinct from 'published' then
      raise exception 'Event is not open for booking';
    end if;

    if v_ticket.status <> 'available' then
      raise exception 'Tickets are not currently available for %', v_ticket_type_id;
    end if;

    if v_ticket.sold_quantity + v_quantity > v_ticket.total_quantity then
      raise exception 'Not enough tickets remaining for %', v_ticket_type_id;
    end if;

    update ticket_types
      set sold_quantity = sold_quantity + v_quantity,
          status = case
            when sold_quantity + v_quantity >= total_quantity then 'sold_out'::ticket_status
            else status
          end
      where id = v_ticket_type_id;

    insert into bookings (
      user_id, ticket_type_id, event_id, quantity,
      total_amount, currency, status, qr_code
    )
    values (
      v_user_id,
      v_ticket_type_id,
      v_ticket.event_id,
      v_quantity,
      v_ticket.price * v_quantity,
      v_ticket.currency,
      'pending',
      'SNX-' || upper(substr(replace(uuid_generate_v4()::text, '-', ''), 1, 12))
    )
    returning * into v_booking;

    return next v_booking;
  end loop;

  return;
end;
$$;

grant execute on function create_bookings(jsonb) to authenticated;
