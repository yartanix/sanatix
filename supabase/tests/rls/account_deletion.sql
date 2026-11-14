begin;
select plan(9);

set local role postgres;

insert into auth.users (id, email) values
  ('a1111111-1111-1111-1111-111111111111', 'customer@test.com'),
  ('a2222222-2222-2222-2222-222222222222', 'organizer@test.com'),
  ('a3333333-3333-3333-3333-333333333333', 'bystander@test.com');

update profiles set role = 'organizer' where id = 'a2222222-2222-2222-2222-222222222222';

insert into events (id, organizer_id, title_ar, title_en, venue_city, starts_at, ends_at, category)
values ('a4444444-4444-4444-4444-444444444444', 'a2222222-2222-2222-2222-222222222222',
        'فعالية', 'Event', 'Riyadh', now(), now() + interval '1 hour', 'concert');

insert into ticket_types (id, event_id, name_ar, name_en, price, currency, total_quantity, sold_quantity)
values ('a5555555-5555-5555-5555-555555555555', 'a4444444-4444-4444-4444-444444444444',
        'عادي', 'Regular', 100, 'SAR', 100, 0);

insert into bookings (id, event_id, ticket_type_id, user_id, quantity, total_amount, currency, status)
values ('a6666666-6666-6666-6666-666666666666', 'a4444444-4444-4444-4444-444444444444',
        'a5555555-5555-5555-5555-555555555555', 'a1111111-1111-1111-1111-111111111111',
        1, 100, 'SAR', 'pending');

insert into reviews (user_id, event_id, rating)
values ('a1111111-1111-1111-1111-111111111111', 'a4444444-4444-4444-4444-444444444444', 5);

insert into parties (id, host_id, title, starts_at)
values ('a7777777-7777-7777-7777-777777777777', 'a1111111-1111-1111-1111-111111111111',
        'Birthday', now() + interval '1 day');

-- Anonymous visitors cannot call it at all.
select tests.logout();
select throws_ok(
  $$ select public.delete_my_account() $$,
  '42501',
  null,
  'anon cannot execute delete_my_account()'
);

-- An organizer with someone else's live booking is refused, and nothing is deleted.
select tests.login_as('a2222222-2222-2222-2222-222222222222');
select throws_ok(
  $$ select public.delete_my_account() $$,
  'P0001',
  'ACCOUNT_HAS_ACTIVE_COMMITMENTS',
  'organizer holding another user''s live booking cannot delete their account'
);
set local role postgres;
select is(
  (select count(*)::int from auth.users where id = 'a2222222-2222-2222-2222-222222222222'),
  1,
  'the refused organizer account still exists'
);

-- A customer can delete their own account, and only their own.
select tests.login_as('a1111111-1111-1111-1111-111111111111');
select lives_ok(
  $$ select public.delete_my_account() $$,
  'customer can delete their own account'
);
set local role postgres;
select is(
  (select count(*)::int from auth.users where id = 'a1111111-1111-1111-1111-111111111111'),
  0,
  'the customer''s auth.users row is gone'
);
select is(
  (select count(*)::int from profiles where id = 'a1111111-1111-1111-1111-111111111111')
  + (select count(*)::int from bookings where user_id = 'a1111111-1111-1111-1111-111111111111')
  + (select count(*)::int from reviews where user_id = 'a1111111-1111-1111-1111-111111111111')
  + (select count(*)::int from parties where host_id = 'a1111111-1111-1111-1111-111111111111'),
  0,
  'the customer''s profile, bookings, reviews and parties are gone'
);
select is(
  (select count(*)::int from auth.users
    where id in ('a2222222-2222-2222-2222-222222222222', 'a3333333-3333-3333-3333-333333333333')),
  2,
  'no other account was touched'
);

-- With the other user's booking gone, the organizer can now delete too,
-- and their events go with them.
select tests.login_as('a2222222-2222-2222-2222-222222222222');
select lives_ok(
  $$ select public.delete_my_account() $$,
  'organizer with no outstanding commitments can delete their account'
);
set local role postgres;
select is(
  (select count(*)::int from events where id = 'a4444444-4444-4444-4444-444444444444'),
  0,
  'the organizer''s events are removed with the account'
);

select * from finish();
rollback;
