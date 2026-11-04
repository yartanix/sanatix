begin;
select plan(7);

set local role postgres;

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'owner@test.com'),
  ('22222222-2222-2222-2222-222222222222', 'organizer@test.com'),
  ('33333333-3333-3333-3333-333333333333', 'stranger@test.com');

update profiles set role = 'organizer' where id = '22222222-2222-2222-2222-222222222222';

insert into events (id, organizer_id, title_ar, title_en, venue_city, starts_at, ends_at, category)
values ('44444444-4444-4444-4444-444444444444', '22222222-2222-2222-2222-222222222222',
        'فعالية', 'Event', 'Riyadh', now(), now() + interval '1 hour', 'concert');

insert into ticket_types (id, event_id, name_ar, name_en, price, currency, total_quantity, sold_quantity)
values ('55555555-5555-5555-5555-555555555555', '44444444-4444-4444-4444-444444444444',
        'عادي', 'Regular', 100, 'SAR', 100, 0);

insert into bookings (id, event_id, ticket_type_id, user_id, quantity, total_amount, currency, status)
values ('66666666-6666-6666-6666-666666666666', '44444444-4444-4444-4444-444444444444',
        '55555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111',
        1, 100, 'SAR', 'confirmed');

select tests.login_as('11111111-1111-1111-1111-111111111111');
select is(
  (select count(*)::int from bookings where id = '66666666-6666-6666-6666-666666666666'),
  1,
  'owner can see their own booking'
);

select lives_ok(
  $$ update bookings set status = 'cancelled' where id = '66666666-6666-6666-6666-666666666666' $$,
  'owner can update their own booking'
);
select is(
  (select status::text from bookings where id = '66666666-6666-6666-6666-666666666666'),
  'cancelled',
  'the update actually took effect'
);

select tests.login_as('22222222-2222-2222-2222-222222222222');
select is(
  (select count(*)::int from bookings where id = '66666666-6666-6666-6666-666666666666'),
  1,
  'organizer can see a booking for their own event'
);

select is(
  (select count(*)::int from bookings
   where id = '66666666-6666-6666-6666-666666666666'
     and status = 'cancelled'),
  1,
  'organizer-visible row is unaffected (organizer''s policy is select-only, cannot be used to prove write access)'
);

select tests.login_as('33333333-3333-3333-3333-333333333333');
select is(
  (select count(*)::int from bookings where id = '66666666-6666-6666-6666-666666666666'),
  0,
  'an unrelated user cannot see someone else''s booking'
);

select tests.logout();
select is(
  (select count(*)::int from bookings),
  0,
  'anon with no identity sees zero bookings'
);

select * from finish();
rollback;
