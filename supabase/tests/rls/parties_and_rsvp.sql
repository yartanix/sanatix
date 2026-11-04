begin;
select plan(9);

set local role postgres;
insert into auth.users (id, email) values
  ('bbbbbbbb-0000-0000-0000-000000000001', 'host@test.com'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'other-host@test.com');

insert into parties (id, host_id, title, starts_at)
values ('cccccccc-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001',
        'Birthday Party', now() + interval '3 days');

insert into party_guests (id, party_id, name, rsvp_token)
values ('dddddddd-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000001',
        'Guest One', 'eeeeeeee-0000-0000-0000-000000000001');

-- the host can see and manage their own party + guest list
select tests.login_as('bbbbbbbb-0000-0000-0000-000000000001');
select is((select count(*)::int from parties where id = 'cccccccc-0000-0000-0000-000000000001'), 1,
  'host can see their own party');
select is((select count(*)::int from party_guests where party_id = 'cccccccc-0000-0000-0000-000000000001'), 1,
  'host can see their own party''s guest list');
select lives_ok(
  $$ update party_guests set name = 'Guest One (renamed)' where id = 'dddddddd-0000-0000-0000-000000000001' $$,
  'host can edit their own guest list'
);

-- a different, unrelated host cannot see or touch it at all
select tests.login_as('bbbbbbbb-0000-0000-0000-000000000002');
select is((select count(*)::int from parties where id = 'cccccccc-0000-0000-0000-000000000001'), 0,
  'a different host cannot see someone else''s party');
select is((select count(*)::int from party_guests where party_id = 'cccccccc-0000-0000-0000-000000000001'), 0,
  'a different host cannot see someone else''s guest list');

-- anon has zero direct table access (the only legitimate path is the token-gated RPCs)
select tests.logout();
select is((select count(*)::int from parties), 0, 'anon has no direct read access to parties at all');
select is((select count(*)::int from party_guests), 0, 'anon has no direct read access to party_guests at all');

-- but anon CAN use the token-gated RPC with the correct token
select is(
  (select guest_name from get_rsvp_details('eeeeeeee-0000-0000-0000-000000000001')),
  'Guest One (renamed)',
  'anon with the correct rsvp token gets exactly that guest''s details via the security-definer RPC'
);

-- a guessed/wrong token returns nothing, not someone else's row
select is(
  (select count(*)::int from get_rsvp_details('ffffffff-0000-0000-0000-000000000099')),
  0,
  'a wrong/guessed rsvp token returns no rows at all'
);

select * from finish();
rollback;
