-- Vendor ratings (Fahoood, Nov 26 2026): organizers can rate vendors they
-- dealt with, 1-5 stars, with an optional comment. Average rating must
-- show on the vendor listing automatically — no manual step.
--
-- Two gaps this closes, both at the DB level (not just the Next.js app
-- layer — PostgREST exposes this table directly to any client holding a
-- user's JWT, so a Next.js-only check is not a real boundary, same
-- principle as migration 013's privilege-escalation fixes):
--
-- 1. vendors.rating / vendors.review_count existed but nothing ever
--    recalculated them — they've sat null/0 for every one of the 202
--    vendors since launch. A trigger now keeps them in sync with the
--    reviews table on every insert/update/delete, so "average rating on
--    the listing" is always correct without a cron job or an admin
--    action.
-- 2. reviews_manage_own (migration's original RLS) lets ANY authenticated
--    user insert a review row for ANY vendor_id with no relationship
--    check at all — "dealt with" was never enforced anywhere, app layer
--    included (src/app/api/reviews/route.ts's own comment said as much:
--    "Vendors have no such gate today"). There is no real vendor-booking
--    record in this product yet (see sanatix-architect: no payment
--    gateway, no vendor-hire transaction), so the best available signal
--    for "this organizer actually dealt with this vendor" is a
--    vendor_inquiries row they sent to that vendor. A BEFORE INSERT
--    trigger now requires: the reviewer's profile role is 'organizer',
--    AND a vendor_inquiries row exists linking that user to that vendor.
--    This is a deliberate, disclosed approximation — once a real
--    vendor-hire/booking record exists, tighten this to require that
--    instead.
--
-- Comment moderation (offensive/unlawful content) happens in the app
-- layer (src/lib/moderation.ts, called from src/app/api/reviews/route.ts)
-- before a row is even attempted — not modeled here, since that needs an
-- LLM call, not SQL.

create or replace function public.recalc_vendor_rating(p_vendor_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.vendors v
  set rating = agg.avg_rating,
      review_count = agg.cnt
  from (
    select
      coalesce(round(avg(r.rating)::numeric, 1), null) as avg_rating,
      count(*) as cnt
    from public.reviews r
    where r.vendor_id = p_vendor_id
  ) agg
  where v.id = p_vendor_id;
end;
$$;

create or replace function public.trg_recalc_vendor_rating()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    if old.vendor_id is not null then
      perform public.recalc_vendor_rating(old.vendor_id);
    end if;
    return old;
  end if;

  if new.vendor_id is not null then
    perform public.recalc_vendor_rating(new.vendor_id);
  end if;
  -- an UPDATE that changed which vendor a review belongs to (shouldn't
  -- happen in practice, nothing in the app does this) would otherwise
  -- leave the old vendor's cached rating stale
  if tg_op = 'UPDATE' and old.vendor_id is not null and old.vendor_id is distinct from new.vendor_id then
    perform public.recalc_vendor_rating(old.vendor_id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_reviews_recalc_vendor_rating on public.reviews;
create trigger trg_reviews_recalc_vendor_rating
  after insert or update or delete on public.reviews
  for each row
  execute function public.trg_recalc_vendor_rating();

-- ─── Eligibility: organizer + an actual vendor_inquiries relationship ──

create or replace function public.trg_enforce_vendor_review_eligibility()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  reviewer_role text;
  has_dealt_with boolean;
begin
  -- Privileged roles (service_role, dashboard, any SECURITY DEFINER RPC
  -- running as owner) bypass this — same is_privileged_db_role() gate
  -- migration 013 established, so seeding/admin tooling isn't blocked.
  if new.vendor_id is null or public.is_privileged_db_role() then
    return new;
  end if;

  select role into reviewer_role from public.profiles where id = new.user_id;
  if reviewer_role is distinct from 'organizer' then
    raise exception 'Only organizers can rate vendors.' using errcode = '42501';
  end if;

  select exists (
    select 1 from public.vendor_inquiries
    where user_id = new.user_id and vendor_id = new.vendor_id
  ) into has_dealt_with;

  if not has_dealt_with then
    raise exception 'You can only rate a vendor you have contacted.' using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_reviews_enforce_vendor_eligibility on public.reviews;
create trigger trg_reviews_enforce_vendor_eligibility
  before insert on public.reviews
  for each row
  execute function public.trg_enforce_vendor_review_eligibility();

-- ─── Pre-existing gap this feature exposed ─────────────────────────────
-- vendor_inquiries_owner_rw (migration 016) only lets an admin or the
-- vendor's owner SELECT a vendor_inquiries row — the organizer who
-- actually SENT the inquiry couldn't read their own row back. That's
-- what the eligibility check above (and the app-layer one in
-- src/app/api/reviews/route.ts) relies on to confirm "this organizer
-- dealt with this vendor", so without this it would always read as
-- false even when a real inquiry exists. A separate, additive policy
-- (not touching vendor_inquiries_owner_rw) so the existing admin/vendor
-- behavior is unchanged.
create policy vendor_inquiries_select_own
  on public.vendor_inquiries
  for select
  using (user_id = auth.uid());

-- Backfill: vendors.rating/review_count have been stale (always null/0)
-- since launch since nothing ever computed them. Zero reviews exist today
-- so this is a no-op in practice, but it's here so the column is never
-- out of sync with whatever reviews DO already exist on an older copy of
-- this database (e.g. a staging branch).
do $$
declare
  v_id uuid;
begin
  for v_id in select distinct vendor_id from public.reviews where vendor_id is not null loop
    perform public.recalc_vendor_rating(v_id);
  end loop;
end $$;
