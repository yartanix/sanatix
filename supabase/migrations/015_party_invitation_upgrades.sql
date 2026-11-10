-- ============================================================
-- SANATIX — Migration 015
-- Closes the feature gap against single-purpose invitation apps
-- (e.g. Hayhom): direct WhatsApp/SMS delivery status, door-side
-- check-in via a shareable "door pass" link, a configurable custom
-- question + entry code per party, and a small invitation-template
-- gallery. Builds additively on migration 011
-- (party_invitations_rsvp) — nothing here changes existing columns
-- or breaks existing rows; every new column has a safe default.
--
-- No payment logic here. "Premium" templates are flagged but not
-- sellable yet — the payment gateway is still explicitly paused
-- per the founder's standing instruction. This just gives the UI
-- somewhere to show "coming soon" rather than nothing.
-- ============================================================

-- ─── 1. Invitation templates ───────────────────────────────────
-- A small, seeded gallery rather than a real design tool. Free
-- templates are usable today; premium ones are visible (so the
-- upsell exists) but can't actually be selected until payments
-- are wired in — enforced in application code, not here.
create table if not exists invitation_templates (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique,
  name_ar      text not null,
  name_en      text not null,
  accent_color text not null default '#C8973A',
  is_premium   boolean not null default false,
  sort_order   int not null default 0,
  created_at   timestamptz not null default now()
);

alter table invitation_templates enable row level security;

drop policy if exists "invitation_templates_read_all" on invitation_templates;
create policy "invitation_templates_read_all"
  on invitation_templates for select
  using (true);

insert into invitation_templates (slug, name_ar, name_en, accent_color, is_premium, sort_order)
values
  ('classic-gold',   'كلاسيكي ذهبي',   'Classic Gold',    '#C8973A', false, 0),
  ('soft-rose',      'وردي ناعم',       'Soft Rose',       '#E8A5B0', false, 1),
  ('midnight-teal',  'أزرق ليلي',       'Midnight Teal',   '#2F6F6A', false, 2),
  ('kids-confetti',  'كونفيتي الأطفال', 'Kids'' Confetti', '#F2B33D', false, 3),
  ('royal-emboss',   'نقش ملكي',        'Royal Emboss',    '#8A6D3B', true,  4),
  ('animated-3d',    'متحرك ثلاثي الأبعاد', '3D Animated', '#B83280', true,  5)
on conflict (slug) do nothing;

-- ─── 2. Parties: richer invitation configuration ───────────────
alter table parties
  add column if not exists template_id        uuid references invitation_templates(id) on delete set null,
  add column if not exists allow_plus_ones    boolean not null default true,
  add column if not exists custom_question    text,
  add column if not exists require_entry_code boolean not null default false,
  add column if not exists entry_code         text,
  add column if not exists auto_send_channel  text not null default 'none'
                             check (auto_send_channel in ('none', 'whatsapp', 'sms')),
  add column if not exists door_pass_token    uuid not null default gen_random_uuid();

create unique index if not exists parties_door_pass_token_idx on parties(door_pass_token);

-- ─── 3. Party guests: delivery + check-in state ────────────────
alter table party_guests
  add column if not exists invite_channel        text not null default 'none'
                              check (invite_channel in ('none', 'whatsapp', 'sms')),
  add column if not exists invite_status         text not null default 'pending'
                              check (invite_status in ('pending', 'sent', 'failed')),
  add column if not exists invite_sent_at         timestamptz,
  add column if not exists last_reminder_sent_at  timestamptz,
  add column if not exists custom_answer          text,
  add column if not exists checked_in_at           timestamptz,
  add column if not exists checked_in_via          text check (checked_in_via in ('door-pass', 'host'));

-- ─── 4. get_rsvp_details: return the new per-party config too ──
-- Signature changes (more returned columns) — recreated rather
-- than altered, same as a normal `create or replace` would do for
-- a function, but this one's return type is changing so the old
-- one has to go first.
drop function if exists get_rsvp_details(uuid);

create function get_rsvp_details(token uuid)
returns table (
  party_id           uuid,
  title              text,
  starts_at          timestamptz,
  location_name      text,
  location_address   text,
  notes              text,
  cover_image        text,
  guest_name         text,
  guest_rsvp_status  text,
  guest_count        int,
  allow_plus_ones    boolean,
  custom_question    text,
  custom_answer      text,
  require_entry_code boolean,
  entry_code         text,
  template_accent    text,
  checked_in_at      timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select p.id, p.title, p.starts_at, p.location_name, p.location_address, p.notes, p.cover_image,
         g.name, g.rsvp_status, g.guest_count,
         p.allow_plus_ones, p.custom_question, g.custom_answer,
         p.require_entry_code,
         case when g.rsvp_status = 'yes' then p.entry_code else null end,
         coalesce(t.accent_color, '#C8973A'),
         g.checked_in_at
  from party_guests g
  join parties p on p.id = g.party_id
  left join invitation_templates t on t.id = p.template_id
  where g.rsvp_token = token
$$;

grant execute on function get_rsvp_details(uuid) to anon, authenticated;

-- ─── 5. submit_rsvp: accept the custom-question answer too ─────
drop function if exists submit_rsvp(uuid, text, int);

create function submit_rsvp(
  token uuid,
  new_status text,
  new_guest_count int default 1,
  new_custom_answer text default null
)
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
  set rsvp_status   = new_status,
      guest_count   = greatest(1, least(20, coalesce(new_guest_count, 1))),
      custom_answer = coalesce(new_custom_answer, custom_answer),
      responded_at  = now()
  where rsvp_token = token;

  if not found then
    raise exception 'invalid rsvp token';
  end if;
end;
$$;

grant execute on function submit_rsvp(uuid, text, int, text) to anon, authenticated;

-- ─── 6. Door-pass check-in ──────────────────────────────────────
-- A party's door_pass_token is a second, separate "bearer link" a
-- host can hand to whoever is working the door (a friend, or a
-- staffing vendor booked through the marketplace) without giving
-- them account access. It can only ever do one thing: mark a
-- guest of *that* party as checked in. It never lists guests, so
-- it can't be used to see who else is invited.

create or replace function get_door_pass_party(door_pass uuid)
returns table (party_id uuid, title text, starts_at timestamptz)
language sql
security definer
set search_path = public
stable
as $$
  select id, title, starts_at from parties where door_pass_token = door_pass
$$;

grant execute on function get_door_pass_party(uuid) to anon, authenticated;

-- `guest_ref` is either a guest's full rsvp_token (uuid, e.g. decoded
-- from their QR by any generic QR-scanner app, since the QR just encodes
-- the plain RSVP URL) or the short 8-character prefix of it, uppercase,
-- which is what's shown as plain text under the QR for door staff who'd
-- rather type a code than scan — mirrors the "entry code" pattern
-- Hayhom's own gatekeeper product uses, without needing camera
-- permissions in the browser at all (this app's Permissions-Policy
-- deliberately disables camera site-wide; this function is designed to
-- never need it).
create or replace function checkin_by_door_pass(door_pass uuid, guest_ref text)
returns table (guest_name text, already_checked_in boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  target_party_id uuid;
  g record;
  as_uuid uuid;
begin
  select id into target_party_id from parties where door_pass_token = door_pass;
  if target_party_id is null then
    raise exception 'invalid door pass';
  end if;

  begin
    as_uuid := guest_ref::uuid;
  exception when others then
    as_uuid := null;
  end;

  if as_uuid is not null then
    select id, name, checked_in_at into g
    from party_guests
    where rsvp_token = as_uuid and party_id = target_party_id;
  else
    select id, name, checked_in_at into g
    from party_guests
    where party_id = target_party_id
      and upper(left(rsvp_token::text, 8)) = upper(guest_ref)
    limit 1;
  end if;

  if g.id is null then
    raise exception 'guest not found for this party';
  end if;

  if g.checked_in_at is not null then
    return query select g.name, true;
    return;
  end if;

  update party_guests
  set checked_in_at = now(), checked_in_via = 'door-pass'
  where id = g.id;

  return query select g.name, false;
end;
$$;

grant execute on function checkin_by_door_pass(uuid, text) to anon, authenticated;
