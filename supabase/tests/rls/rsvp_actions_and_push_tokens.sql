begin;
select plan(7);

set local role postgres;
insert into auth.users (id, email) values
  ('bbbbbbbb-1111-0000-0000-000000000001', 'host2@test.com'),
  ('bbbbbbbb-1111-0000-0000-000000000002', 'other-user@test.com');

insert into parties (id, host_id, title, starts_at)
values ('cccccccc-1111-0000-0000-000000000001', 'bbbbbbbb-1111-0000-0000-000000000001',
        'Pool Party', now() + interval '5 days');

insert into party_guests (id, party_id, name, rsvp_token, rsvp_status)
values ('dddddddd-1111-0000-0000-000000000001', 'cccccccc-1111-0000-0000-000000000001',
        'Guest Two', 'eeeeeeee-1111-0000-0000-000000000001', 'pending');

-- anon can RSVP yes with the correct token
select tests.logout();
select lives_ok(
  $$ select submit_rsvp('eeeeeeee-1111-0000-0000-000000000001', 'yes', 3) $$,
  'anon can submit an rsvp with the correct token'
);
set local role postgres;
select is(
  (select rsvp_status from party_guests where id = 'dddddddd-1111-0000-0000-000000000001'),
  'yes',
  'the rsvp status actually updated'
);
select is(
  (select guest_count from party_guests where id = 'dddddddd-1111-0000-0000-000000000001'),
  3,
  'the guest count actually updated'
);

-- a wrong token raises instead of silently updating some other row
select tests.logout();
select throws_like(
  $$ select submit_rsvp('ffffffff-1111-0000-0000-000000000099', 'yes', 2) $$,
  '%invalid rsvp token%',
  'an unknown rsvp token raises rather than updating anything'
);

-- an invalid status value is rejected (not persisted as garbage)
select throws_like(
  $$ select submit_rsvp('eeeeeeee-1111-0000-0000-000000000001', 'definitely-not-a-status', 1) $$,
  '%invalid rsvp status%',
  'a bogus rsvp status is rejected rather than stored'
);

-- push_tokens: a user manages only their own device tokens
set local role postgres;
select tests.login_as('bbbbbbbb-1111-0000-0000-000000000001');
select lives_ok(
  $$ insert into push_tokens (user_id, expo_push_token, platform) values ('bbbbbbbb-1111-0000-0000-000000000001', 'ExponentPushToken[abc123]', 'android') $$,
  'a user can register their own push token'
);
select tests.login_as('bbbbbbbb-1111-0000-0000-000000000002');
select is(
  (select count(*)::int from push_tokens where user_id = 'bbbbbbbb-1111-0000-0000-000000000001'),
  0,
  'a different user cannot read someone else''s push token'
);

select * from finish();
rollback;
