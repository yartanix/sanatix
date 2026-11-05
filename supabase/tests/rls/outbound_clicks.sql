begin;
select plan(6);

set local role postgres;
insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'admin@test.com'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'customer@test.com');
update profiles set role = 'admin' where id = 'aaaaaaaa-0000-0000-0000-000000000001';

-- anon (a logged-out visitor clicking "Get tickets") can log a click
select tests.logout();
select lives_ok(
  $$ insert into outbound_clicks (kind, target_url) values ('event_ticket', 'https://example.com/tix') $$,
  'anon can insert an outbound click'
);

-- but that same anon cannot read any clicks back, including their own
select is(
  (select count(*)::int from outbound_clicks),
  0,
  'anon cannot read outbound clicks, not even the one they just logged'
);

-- a logged-in, non-admin customer also cannot read them
select tests.login_as('aaaaaaaa-0000-0000-0000-000000000002');
select lives_ok(
  $$ insert into outbound_clicks (kind, target_url, user_id) values
     ('vendor_website', 'https://example.com/vendor', 'aaaaaaaa-0000-0000-0000-000000000002') $$,
  'an authenticated non-admin can insert a click attributed to themselves'
);
select is(
  (select count(*)::int from outbound_clicks),
  0,
  'an authenticated non-admin still cannot read outbound click analytics'
);

-- migration 014: a logged-in user cannot attribute a click to someone
-- else's user_id via a direct insert (the app route never does this —
-- it always derives user_id from the caller's own session — but a
-- direct PostgREST call must be blocked from spoofing it too).
select throws_like(
  $$ insert into outbound_clicks (kind, target_url, user_id) values
     ('vendor_website', 'https://example.com/vendor', 'aaaaaaaa-0000-0000-0000-000000000001') $$,
  '%new row violates row-level security policy%',
  'a user cannot log an outbound click attributed to a different user_id'
);

-- only an admin can read them
select tests.login_as('aaaaaaaa-0000-0000-0000-000000000001');
select is(
  (select count(*)::int from outbound_clicks),
  2,
  'an admin can read all outbound click analytics'
);

select * from finish();
rollback;
