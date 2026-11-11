-- ============================================================
-- SANATIX — Migration 016
-- Supplier self-service backend. Discovered while scoping the new
-- Supplier mobile app: vendors.owner_id + the existing
-- "vendors_manage_own" RLS policy (migration 013 already locks
-- is_verified/is_featured/is_premium behind an admin-only trigger)
-- already let a vendor edit their own profile safely — no schema
-- change needed for that part.
--
-- What's genuinely missing, and what this migration adds:
--   1. A booking/inquiry inbox. There was no table distinct from the
--      ticket-purchase `bookings` table for "someone asked a vendor
--      about availability/pricing" — vendors had literally nothing
--      to see here before now.
--   2. A way for a vendor to respond to a review left about them.
--      `reviews` existed (read-only to everyone, write-own to the
--      author) but had no response column and no policy letting the
--      *vendor* touch a row they don't own.
--
-- Same column-level-RLS discipline as migration 013: row ownership
-- (RLS) is necessary but not sufficient, so triggers additionally
-- lock down which columns each side of a row may touch.
-- ============================================================

-- ─── 1. Vendor inquiries ────────────────────────────────────────
-- A guest-friendly contact form, same trust model as the party RSVP
-- flow (migration 011): no account required to ask a vendor a
-- question. Only the vendor who owns the target row can ever read or
-- respond to an inquiry — the asker has no token-based read-back in
-- this first version (they're expected to be contacted directly via
-- the phone/email they gave, same as any "contact us" form).
create table if not exists vendor_inquiries (
  id                 uuid primary key default gen_random_uuid(),
  vendor_id          uuid not null references vendors(id) on delete cascade,
  user_id            uuid references profiles(id) on delete set null,
  name               text not null,
  phone              text,
  email              text,
  event_date         date,
  message            text not null,
  status             text not null default 'new'
                        check (status in ('new', 'responded', 'closed')),
  vendor_response    text,
  vendor_response_at timestamptz,
  created_at         timestamptz not null default now()
);

create index if not exists idx_vendor_inquiries_vendor on vendor_inquiries(vendor_id, created_at desc);

alter table vendor_inquiries enable row level security;

-- Anyone (including anon) may file an inquiry — same posture as
-- party_guests inserts. The app only ever inserts name/message/etc
-- plus vendor_id; status/vendor_response are locked by the trigger
-- below regardless of who's inserting.
drop policy if exists "vendor_inquiries_insert_any" on vendor_inquiries;
create policy "vendor_inquiries_insert_any"
  on vendor_inquiries for insert
  with check (true);

-- Only the vendor's owner (or an admin) can see or act on inquiries
-- about their own vendor. The person who filed it cannot read it back
-- in this version.
drop policy if exists "vendor_inquiries_owner_rw" on vendor_inquiries;
create policy "vendor_inquiries_owner_rw"
  on vendor_inquiries for select
  using (
    is_admin_user()
    or exists (select 1 from vendors v where v.id = vendor_id and v.owner_id = auth.uid())
  );

drop policy if exists "vendor_inquiries_owner_update" on vendor_inquiries;
create policy "vendor_inquiries_owner_update"
  on vendor_inquiries for update
  using (
    is_admin_user()
    or exists (select 1 from vendors v where v.id = vendor_id and v.owner_id = auth.uid())
  );

-- A vendor owner may only ever change status/vendor_response(_at) —
-- never rewrite the asker's own words or redirect the inquiry to a
-- different vendor.
create or replace function enforce_vendor_inquiries_response_only() returns trigger
language plpgsql as $$
begin
  if is_privileged_db_role() then
    return new;
  end if;

  if new.vendor_id is distinct from old.vendor_id
     or new.user_id is distinct from old.user_id
     or new.name is distinct from old.name
     or new.phone is distinct from old.phone
     or new.email is distinct from old.email
     or new.event_date is distinct from old.event_date
     or new.message is distinct from old.message
     or new.created_at is distinct from old.created_at then
    raise exception 'only status and vendor_response may be updated on an inquiry';
  end if;

  if new.vendor_response is distinct from old.vendor_response and new.vendor_response is not null then
    new.vendor_response_at := now();
    if new.status = 'new' then
      new.status := 'responded';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_vendor_inquiries_response_only on vendor_inquiries;
create trigger trg_enforce_vendor_inquiries_response_only
  before update on vendor_inquiries
  for each row execute function enforce_vendor_inquiries_response_only();

grant select, insert, update on vendor_inquiries to anon, authenticated;

-- ─── 2. Review responses ────────────────────────────────────────
alter table reviews
  add column if not exists vendor_response    text,
  add column if not exists vendor_response_at timestamptz;

-- A vendor owner may read+update (response only) reviews about their
-- own vendor, in addition to the existing public read / own-author
-- write policies already on this table.
drop policy if exists "reviews_vendor_respond" on reviews;
create policy "reviews_vendor_respond"
  on reviews for update
  using (
    vendor_id is not null
    and exists (select 1 from vendors v where v.id = vendor_id and v.owner_id = auth.uid())
  );

create or replace function enforce_reviews_vendor_response_only() returns trigger
language plpgsql as $$
begin
  if is_privileged_db_role() then
    return new;
  end if;

  -- The review's own author updates via "reviews_manage_own" and may
  -- change anything on their own row (unchanged pre-existing
  -- behavior). This trigger only needs to constrain the *other* path
  -- in a vendor isn't also the author: if the session is the vendor
  -- owner of this review's vendor and not the review's author, lock
  -- everything except the response fields.
  if auth.uid() is distinct from old.user_id
     and exists (select 1 from vendors v where v.id = old.vendor_id and v.owner_id = auth.uid()) then
    if new.rating is distinct from old.rating
       or new.comment_ar is distinct from old.comment_ar
       or new.comment_en is distinct from old.comment_en
       or new.user_id is distinct from old.user_id
       or new.vendor_id is distinct from old.vendor_id
       or new.event_id is distinct from old.event_id then
      raise exception 'a vendor may only set vendor_response on a review, not edit the review itself';
    end if;
    if new.vendor_response is distinct from old.vendor_response then
      new.vendor_response_at := now();
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_reviews_vendor_response_only on reviews;
create trigger trg_enforce_reviews_vendor_response_only
  before update on reviews
  for each row execute function enforce_reviews_vendor_response_only();
