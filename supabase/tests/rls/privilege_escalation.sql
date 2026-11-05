-- Migration 013 — column-level privilege-escalation fixes. Each block
-- proves BOTH halves: the attack is actually blocked, AND the
-- legitimate privileged path it must not break still works.

begin;
select plan(13);

set local role postgres;

insert into auth.users (id, email) values
  ('a1111111-0000-0000-0000-000000000001', 'victim@test.com'),
  ('a2222222-0000-0000-0000-000000000002', 'admin@test.com'),
  ('a3333333-0000-0000-0000-000000000003', 'vendor-owner@test.com'),
  ('a4444444-0000-0000-0000-000000000004', 'organizer@test.com');

update profiles set role = 'admin' where id = 'a2222222-0000-0000-0000-000000000002';

-- ─── 1. profiles.role: self-escalation is blocked ───────────────
select tests.login_as('a1111111-0000-0000-0000-000000000001');

select throws_like(
  $$ update profiles set role = 'admin' where id = 'a1111111-0000-0000-0000-000000000001' $$,
  '%can only be changed by an administrator%',
  'a user cannot self-escalate profiles.role to admin'
);

select is(
  (select role::text from profiles where id = 'a1111111-0000-0000-0000-000000000001'),
  'customer',
  'role is still the original default after the blocked attempt'
);

-- ...but a privileged DB role (dashboard/service_role — modeled here
-- as the connecting superuser) can still change it.
set local role postgres;
select lives_ok(
  $$ update profiles set role = 'organizer' where id = 'a1111111-0000-0000-0000-000000000001' $$,
  'a privileged DB role (dashboard / service_role) can still change profiles.role'
);

-- ─── 2. vendors moderation flags: owner cannot self-verify ──────
set local role postgres;
insert into vendors (id, owner_id, name_ar, name_en, category, city)
values ('b1111111-0000-0000-0000-000000000001', 'a3333333-0000-0000-0000-000000000003',
        'مزود', 'Vendor', 'catering', 'Riyadh');

select tests.login_as('a3333333-0000-0000-0000-000000000003');
select throws_like(
  $$ update vendors set is_verified = true where id = 'b1111111-0000-0000-0000-000000000001' $$,
  '%can only be changed by an administrator%',
  'a vendor owner cannot self-verify their own listing'
);

select throws_like(
  $$ update vendors set is_featured = true where id = 'b1111111-0000-0000-0000-000000000001' $$,
  '%can only be changed by an administrator%',
  'a vendor owner cannot self-feature their own listing'
);

-- An admin app-user (profiles.role = 'admin', the same path
-- /api/admin/vendors/[id] actually uses) can still verify it.
select tests.login_as('a2222222-0000-0000-0000-000000000002');
select lives_ok(
  $$ update vendors set is_verified = true where id = 'b1111111-0000-0000-0000-000000000001' $$,
  'an admin app-user can still set vendors.is_verified'
);

-- ─── 3. events.is_featured: organizer cannot self-promote ───────
set local role postgres;
insert into events (id, organizer_id, title_ar, title_en, venue_city, starts_at, ends_at, category)
values ('c1111111-0000-0000-0000-000000000001', 'a4444444-0000-0000-0000-000000000004',
        'فعالية', 'Event', 'Riyadh', now(), now() + interval '1 hour', 'concert');

select tests.login_as('a4444444-0000-0000-0000-000000000004');
select throws_like(
  $$ update events set is_featured = true where id = 'c1111111-0000-0000-0000-000000000001' $$,
  '%can only be changed by an administrator%',
  'an organizer cannot self-feature their own event'
);

-- An ordinary (non-flagged) update to an owned event is unaffected.
select lives_ok(
  $$ update events set title_en = 'Updated title' where id = 'c1111111-0000-0000-0000-000000000001' $$,
  'an organizer can still edit other fields on their own event'
);

-- ─── 4. campaigns stats: organizer cannot fabricate "funded" ────
set local role postgres;
insert into campaigns (id, organizer_id, title_ar, title_en, goal_amount, deadline)
values ('d1111111-0000-0000-0000-000000000001', 'a4444444-0000-0000-0000-000000000004',
        'حملة', 'Campaign', 10000, now() + interval '30 days');

select tests.login_as('a4444444-0000-0000-0000-000000000004');
select throws_like(
  $$ update campaigns set raised_amount = 999999, status = 'funded'
     where id = 'd1111111-0000-0000-0000-000000000001' $$,
  '%can only be updated by the system%',
  'an organizer cannot directly fabricate their own campaign''s raised_amount/status'
);

-- A real contribution (via the existing, trusted trigger) still moves
-- those numbers correctly.
set local role postgres;
insert into contributions (campaign_id, user_id, amount)
values ('d1111111-0000-0000-0000-000000000001', 'a1111111-0000-0000-0000-000000000001', 5000);

select is(
  (select raised_amount::numeric from campaigns where id = 'd1111111-0000-0000-0000-000000000001'),
  5000::numeric,
  'a real contribution still updates campaigns.raised_amount via the trigger'
);

-- ─── 5. bookings: owner cannot tamper with price/QR/status ──────
set local role postgres;
insert into ticket_types (id, event_id, name_ar, name_en, price, currency, total_quantity)
values ('e1111111-0000-0000-0000-000000000001', 'c1111111-0000-0000-0000-000000000001',
        'عادي', 'Regular', 100, 'SAR', 100);

insert into bookings (id, event_id, ticket_type_id, user_id, quantity, total_amount, currency, status, qr_code)
values ('f1111111-0000-0000-0000-000000000001', 'c1111111-0000-0000-0000-000000000001',
        'e1111111-0000-0000-0000-000000000001', 'a1111111-0000-0000-0000-000000000001',
        1, 100, 'SAR', 'pending', 'SNX-REAL0000001');

select tests.login_as('a1111111-0000-0000-0000-000000000001');
select throws_like(
  $$ update bookings set total_amount = 0 where id = 'f1111111-0000-0000-0000-000000000001' $$,
  '%can only be changed by the system%',
  'a booking owner cannot edit total_amount directly'
);

select throws_like(
  $$ update bookings set qr_code = 'SNX-FAKE0000001' where id = 'f1111111-0000-0000-0000-000000000001' $$,
  '%can only be changed by the system%',
  'a booking owner cannot forge their own qr_code'
);

select throws_like(
  $$ update bookings set status = 'confirmed' where id = 'f1111111-0000-0000-0000-000000000001' $$,
  '%can only self-transition from pending to cancelled%',
  'a booking owner cannot self-confirm a pending booking'
);

select * from finish();
rollback;
