-- ============================================================
-- SANATIX — Migration 013
-- Security audit finding: several RLS "for all using (owner check)"
-- policies correctly restrict WHICH ROWS a user can touch, but place
-- no restriction on WHICH COLUMNS they can set on those rows. Postgres
-- RLS is row-level, not column-level, so a user who legitimately owns
-- a row can currently set ANY column on it directly — including ones
-- that are supposed to be decided elsewhere (an admin, a trusted
-- trigger, or payment/moderation logic).
--
-- Because this is a Supabase app, the anon/authenticated key and a
-- logged-in user's own JWT are usable directly against the PostgREST
-- API from a browser, bypassing any Next.js API route entirely — so
-- an app-layer field strip (e.g. `delete body.role` in
-- /api/organizer/profile) is not a real boundary. The database is the
-- only real enforcement point, which is what these triggers add.
--
-- Found during the unattended security audit (Nov 2026):
--
--   1. CRITICAL — profiles.role self-escalation. "profiles_update_own"
--      lets any user update their own profiles row with no column
--      restriction, including `role`. A plain authenticated client
--      call like `update profiles set role = 'admin' where id =
--      auth.uid()` succeeds today, which then grants that account
--      every admin-gated policy in the schema (events_manage_admin,
--      vendors_manage_admin, venues_manage_admin, agent_runs/
--      agent_config read, outbound_clicks analytics read) and every
--      admin-only API route (all of which authorize via a
--      profiles.role = 'admin' check against this same table).
--      This is the most severe finding of the audit — full admin
--      takeover from any ordinary signup, no exploit needed beyond
--      one authenticated REST call.
--
--   2. HIGH — vendors self-verification / self-featuring.
--      "vendors_manage_own" lets an owner set is_verified, is_featured,
--      and is_premium on their own vendor row directly, bypassing the
--      entire moderation flow (/api/admin/vendors/[id] is the only
--      intended way to flip is_verified). A vendor can currently grant
--      themselves the "verified" trust badge end users rely on.
--
--   3. MEDIUM — events.is_featured self-promotion.
--      "events_manage_own" plus /api/organizer/events/[id] (which
--      forwards the PATCH body to `.update()` with no field allowlist
--      beyond stripping id/organizer_id) lets an organizer set
--      is_featured = true on their own event directly. There is no
--      admin flow that sets this column today, so the fix simply
--      locks it to its default until one exists.
--
--   4. HIGH — campaigns financial-stat tampering.
--      "campaigns_manage_own" lets an organizer directly set
--      raised_amount, backer_count, and status on their own campaign,
--      bypassing the apply_contribution_to_campaign trigger (migration
--      007) that's supposed to be the only thing moving those numbers.
--      An organizer can currently fabricate "funded" / inflated-pledge
--      campaigns with zero real contributions, which is exactly the
--      kind of social-proof number backers are trusting.
--      (contributions.amount being client-supplied is a known,
--      disclosed product limitation — see PledgeForm's own
--      disclosure and the comment in /api/campaigns/[id]/contributions
--      — "no real payment capture yet". That is not touched here;
--      this fix only stops the campaign's own displayed totals from
--      being edited directly, bypassing even that pledge trigger.)
--
--   5. MEDIUM — bookings financial/identity field tampering.
--      "bookings_own" lets the booking's owner directly set
--      total_amount, qr_code, payment_ref, quantity, currency,
--      ticket_type_id, and event_id on their own booking. Nothing in
--      the app currently updates bookings this way (all creation goes
--      through the atomic create_bookings() RPC), so this has no
--      legitimate use today and is pure exposure — a user could
--      self-mint a valid-looking door-check-in QR code, change the
--      ticket type/event a booking is tied to, or edit the recorded
--      price. Self-service cancellation (status pending -> cancelled)
--      is kept working since it's a reasonable feature; everything
--      else on the row is locked down.
--
-- Fix pattern used throughout: a small helper, is_privileged_db_role(),
-- that is true only for an actual Postgres superuser session (the
-- Supabase SQL editor / dashboard connects as `postgres`) or a role
-- with BYPASSRLS (Supabase's `service_role`). Because SECURITY DEFINER
-- functions run as their *owner* (current_user flips to the owner for
-- the duration of the call), this also transparently allows the
-- existing trusted RPCs that are already SECURITY DEFINER and owned
-- by a superuser/bypassrls role: create_bookings(),
-- apply_contribution_to_campaign(), handle_new_user(), and the
-- agent's createAdminClient() (service_role) calls in
-- src/lib/agents/system-profile.ts and content-agent.ts. None of
-- those needed any change — verified by re-reading each one against
-- this helper's logic, not just assumed.
--
-- For the two columns an *admin* (not just a privileged DB role) is
-- allowed to set — vendors.is_verified/is_featured/is_premium and
-- events.is_featured — the triggers also allow a profiles.role =
-- 'admin' session, matching how /api/admin/vendors/[id] and
-- /api/admin/events/[id] already authorize (the session-bound client
-- as an admin user, not the service-role key — see those routes'
-- own comments).
-- ============================================================

-- ─── Helper: is this session an actual superuser or a BYPASSRLS role? ───
-- True for: the Supabase dashboard/SQL editor (connects as `postgres`,
-- a superuser), the service_role key (has BYPASSRLS), and — because
-- SECURITY DEFINER functions execute as current_user = their owner —
-- any existing SECURITY DEFINER function owned by one of those roles.
create or replace function is_privileged_db_role() returns boolean
language sql stable as $$
  select coalesce(
    (select rolsuper or rolbypassrls from pg_roles where rolname = current_user),
    false
  )
$$;

-- ─── Helper: is the *logged-in application user* (not the DB role) an
-- admin, per profiles.role? Mirrors the inline check every
-- *_manage_admin RLS policy already uses. Plain (not security
-- definer) — profiles is already publicly readable
-- (profiles_read_all), so no RLS bypass is needed here.
create or replace function is_admin_user() returns boolean
language sql stable as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  )
$$;

-- ─── 1. profiles.role — block self-escalation ──────────────────
create or replace function enforce_profiles_role_protection() returns trigger
language plpgsql as $$
begin
  if is_privileged_db_role() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    -- A brand-new row can never arrive with a non-default role unless
    -- a privileged path created it (handle_new_user() never sets role,
    -- so it always keeps the column default of 'customer' here anyway).
    if new.role is distinct from 'customer' then
      raise exception 'profiles.role cannot be set to % on insert by this session', new.role;
    end if;
  elsif tg_op = 'UPDATE' then
    if new.role is distinct from old.role then
      raise exception 'profiles.role can only be changed by an administrator, not by the account itself';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_profiles_role_protection on profiles;
create trigger trg_enforce_profiles_role_protection
  before insert or update on profiles
  for each row execute function enforce_profiles_role_protection();

-- ─── 2. vendors — only an admin (or a privileged DB role) can flip
-- the trust/moderation flags ─────────────────────────────────────
create or replace function enforce_vendors_moderation_protection() returns trigger
language plpgsql as $$
begin
  if is_privileged_db_role() or is_admin_user() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.is_verified or new.is_featured or new.is_premium then
      raise exception 'vendors.is_verified / is_featured / is_premium can only be set by an administrator';
    end if;
  elsif tg_op = 'UPDATE' then
    if new.is_verified is distinct from old.is_verified
       or new.is_featured is distinct from old.is_featured
       or new.is_premium is distinct from old.is_premium then
      raise exception 'vendors.is_verified / is_featured / is_premium can only be changed by an administrator';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_vendors_moderation_protection on vendors;
create trigger trg_enforce_vendors_moderation_protection
  before insert or update on vendors
  for each row execute function enforce_vendors_moderation_protection();

-- ─── 3. events.is_featured — same idea; no admin flow sets this yet,
-- so it's simply locked to its default (false) until one exists ───
create or replace function enforce_events_featured_protection() returns trigger
language plpgsql as $$
begin
  if is_privileged_db_role() or is_admin_user() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.is_featured then
      raise exception 'events.is_featured can only be set by an administrator';
    end if;
  elsif tg_op = 'UPDATE' then
    if new.is_featured is distinct from old.is_featured then
      raise exception 'events.is_featured can only be changed by an administrator';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_events_featured_protection on events;
create trigger trg_enforce_events_featured_protection
  before insert or update on events
  for each row execute function enforce_events_featured_protection();

-- ─── 4. campaigns — raised_amount / backer_count / status are only
-- ever supposed to move via apply_contribution_to_campaign() (migration
-- 007), which is SECURITY DEFINER and therefore already passes
-- is_privileged_db_role() — no special-case needed beyond that ──
create or replace function enforce_campaigns_stats_protection() returns trigger
language plpgsql as $$
begin
  if is_privileged_db_role() then
    return new;
  end if;

  if new.raised_amount is distinct from old.raised_amount
     or new.backer_count is distinct from old.backer_count
     or new.status is distinct from old.status then
    raise exception 'campaigns.raised_amount / backer_count / status can only be updated by the system (via a contribution), not edited directly';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_campaigns_stats_protection on campaigns;
create trigger trg_enforce_campaigns_stats_protection
  before update on campaigns
  for each row execute function enforce_campaigns_stats_protection();

-- ─── 5. bookings — lock everything except a self-service cancel ──
create or replace function enforce_bookings_field_protection() returns trigger
language plpgsql as $$
begin
  if is_privileged_db_role() then
    return new;
  end if;

  -- The owning user may cancel their own still-pending booking and
  -- nothing else — every other column, and every other status
  -- transition, is locked down for a non-privileged session.
  if new.user_id is distinct from old.user_id
     or new.ticket_type_id is distinct from old.ticket_type_id
     or new.event_id is distinct from old.event_id
     or new.quantity is distinct from old.quantity
     or new.total_amount is distinct from old.total_amount
     or new.currency is distinct from old.currency
     or new.qr_code is distinct from old.qr_code
     or new.payment_ref is distinct from old.payment_ref then
    raise exception 'this booking field can only be changed by the system';
  end if;

  if new.status is distinct from old.status
     and not (old.status = 'pending' and new.status = 'cancelled') then
    raise exception 'bookings.status can only self-transition from pending to cancelled';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_bookings_field_protection on bookings;
create trigger trg_enforce_bookings_field_protection
  before update on bookings
  for each row execute function enforce_bookings_field_protection();
