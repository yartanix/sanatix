-- Tracks outbound clicks to external ticket sellers (and, as the same
-- pattern extends, venue/vendor websites). This is the foundation for
-- monetizing referral traffic: before any affiliate/commission deal can
-- be negotiated with a ticketing partner, we need real numbers on which
-- events/organizers/cities are actually driving outbound ticket clicks.
-- Write-only from the client's perspective — a visitor can log their own
-- click but can never read anyone else's; only admins can query the data.

create table if not exists outbound_clicks (
  id          uuid primary key default gen_random_uuid(),
  kind        text not null check (kind in ('event_ticket', 'venue_website', 'vendor_website')),
  event_id    uuid references events(id) on delete set null,
  venue_id    uuid references venues(id) on delete set null,
  vendor_id   uuid references vendors(id) on delete set null,
  target_url  text not null,
  user_id     uuid references auth.users(id) on delete set null,
  locale      text,
  created_at  timestamptz not null default now()
);

alter table outbound_clicks enable row level security;

drop policy if exists "anyone can log an outbound click" on outbound_clicks;
create policy "anyone can log an outbound click"
  on outbound_clicks for insert
  with check (true);

drop policy if exists "admins can read outbound click analytics" on outbound_clicks;
create policy "admins can read outbound click analytics"
  on outbound_clicks for select
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

create index if not exists outbound_clicks_event_id_idx on outbound_clicks(event_id);
create index if not exists outbound_clicks_kind_created_at_idx on outbound_clicks(kind, created_at);
