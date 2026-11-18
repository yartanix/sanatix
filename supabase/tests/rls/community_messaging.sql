-- Tests for migration 021 (community directory, DM gating via
-- users_share_event(), event/party group chat auto-membership,
-- blocking and reporting, and the chat-media storage bucket).

begin;
select plan(37);

set local role postgres;

insert into auth.users (id, email) values
  ('f1111111-0000-0000-0000-000000000001', 'organizer@test.com'),    -- organizes e1
  ('f2222222-0000-0000-0000-000000000002', 'attendee@test.com'),     -- confirmed booking on e1
  ('f3333333-0000-0000-0000-000000000003', 'stranger@test.com'),     -- shares nothing with anyone
  ('f4444444-0000-0000-0000-000000000004', 'invitee@test.com'),      -- event_invites to e1
  ('f5555555-0000-0000-0000-000000000005', 'host@test.com'),         -- hosts party p1
  ('f6666666-0000-0000-0000-000000000006', 'guest@test.com'),        -- linked guest of p1, rsvp yes
  ('f7777777-0000-0000-0000-000000000007', 'alsoattendee@test.com'), -- second confirmed booking on e1
  ('f8888888-0000-0000-0000-000000000008', 'admin@test.com');        -- admin

update profiles set role = 'organizer', full_name = 'Test Organizer' where id = 'f1111111-0000-0000-0000-000000000001';
update profiles set role = 'admin' where id = 'f8888888-0000-0000-0000-000000000008';

insert into events (id, organizer_id, title_ar, title_en, venue_city, starts_at, ends_at, category)
values ('f0000000-0000-0000-0000-00000000000e', 'f1111111-0000-0000-0000-000000000001',
        'فعالية', 'Event', 'Riyadh', now() + interval '1 day', now() + interval '2 days', 'concert');

insert into ticket_types (id, event_id, name_ar, name_en, price, currency, total_quantity, sold_quantity)
values ('f0000000-0000-0000-0000-00000000000a', 'f0000000-0000-0000-0000-00000000000e',
        'عادي', 'Regular', 100, 'SAR', 100, 0);

-- attendee's booking starts 'pending' then flips to 'confirmed' below, to
-- exercise the UPDATE-of-status branch of the auto-join trigger, not just INSERT.
insert into bookings (id, event_id, ticket_type_id, user_id, quantity, total_amount, currency, status)
values ('f0000000-0000-0000-0000-00000000000b', 'f0000000-0000-0000-0000-00000000000e',
        'f0000000-0000-0000-0000-00000000000a', 'f2222222-0000-0000-0000-000000000002',
        1, 100, 'SAR', 'pending');
update bookings set status = 'confirmed' where id = 'f0000000-0000-0000-0000-00000000000b';

-- a second attendee, booked straight in as 'confirmed' (exercises the INSERT branch)
insert into bookings (id, event_id, ticket_type_id, user_id, quantity, total_amount, currency, status)
values ('f0000000-0000-0000-0000-00000000000c', 'f0000000-0000-0000-0000-00000000000e',
        'f0000000-0000-0000-0000-00000000000a', 'f7777777-0000-0000-0000-000000000007',
        1, 100, 'SAR', 'confirmed');

insert into parties (id, host_id, title, starts_at)
values ('f0000000-0000-0000-0000-00000000000d', 'f5555555-0000-0000-0000-000000000005',
        'Party', now() + interval '1 day');

insert into party_guests (id, party_id, name, rsvp_token, user_id, rsvp_status)
values ('f0000000-0000-0000-0000-0000000000f1', 'f0000000-0000-0000-0000-00000000000d',
        'Guest', 'f0000000-0000-0000-0000-0000000000f2', 'f6666666-0000-0000-0000-000000000006', 'yes');

-- the organizer explicitly invites the invitee (not a booking)
select tests.login_as('f1111111-0000-0000-0000-000000000001');
select lives_ok(
  $$ select add_event_invite('f0000000-0000-0000-0000-00000000000e', 'f4444444-0000-0000-0000-000000000004') $$,
  'organizer can invite a Sanatix user to their event'
);

-- ─── directory ───────────────────────────────────────────────────
select tests.login_as('f3333333-0000-0000-0000-000000000003');
select ok(
  (select count(*)::int from directory_profiles) >= 8,
  'any authenticated user sees the full open directory'
);
select throws_ok(
  $$ select phone from directory_profiles limit 1 $$,
  '42703',
  null,
  'directory_profiles has no phone column at all, even for an open directory'
);
select ok(
  (select count(*)::int from search_directory('organizer')) >= 1,
  'search_directory finds a user by (partial) name match'
);

-- ─── users_share_event() ────────────────────────────────────────
select ok(
  users_share_event('f1111111-0000-0000-0000-000000000001', 'f2222222-0000-0000-0000-000000000002'),
  'organizer and a confirmed attendee share the event'
);
select ok(
  users_share_event('f2222222-0000-0000-0000-000000000002', 'f7777777-0000-0000-0000-000000000007'),
  'two attendees with confirmed bookings on the same event share it'
);
select ok(
  users_share_event('f1111111-0000-0000-0000-000000000001', 'f4444444-0000-0000-0000-000000000004'),
  'organizer and an explicitly-invited (non-booking) user share the event'
);
select ok(
  users_share_event('f5555555-0000-0000-0000-000000000005', 'f6666666-0000-0000-0000-000000000006'),
  'party host and a linked, rsvp-yes guest share the party'
);
select ok(
  not users_share_event('f1111111-0000-0000-0000-000000000001', 'f3333333-0000-0000-0000-000000000003'),
  'the organizer and an unrelated stranger do not share anything'
);

-- ─── start_or_get_dm(): the DM gate ─────────────────────────────
select tests.login_as('f1111111-0000-0000-0000-000000000001');
select throws_ok(
  $$ select start_or_get_dm('f3333333-0000-0000-0000-000000000003') $$,
  'P0001',
  'NO_SHARED_EVENT',
  'organizer cannot DM a stranger they share no event with'
);
select lives_ok(
  $$ select start_or_get_dm('f2222222-0000-0000-0000-000000000002') $$,
  'organizer can start a DM with their event''s confirmed attendee'
);
select is(
  (select start_or_get_dm('f2222222-0000-0000-0000-000000000002')),
  (select start_or_get_dm('f2222222-0000-0000-0000-000000000002')),
  'starting the same DM twice returns the same conversation, not a duplicate'
);
select tests.login_as('f2222222-0000-0000-0000-000000000002');
select is(
  (select start_or_get_dm('f1111111-0000-0000-0000-000000000001')),
  (select id from conversations where kind = 'dm'
     and ((dm_user_a = 'f1111111-0000-0000-0000-000000000001' and dm_user_b = 'f2222222-0000-0000-0000-000000000002')
       or (dm_user_a = 'f2222222-0000-0000-0000-000000000002' and dm_user_b = 'f1111111-0000-0000-0000-000000000001'))),
  'the DM conversation id is the same whichever side calls start_or_get_dm'
);

-- ─── join_event_group() / auto-membership ───────────────────────
select tests.login_as('f3333333-0000-0000-0000-000000000003');
select throws_ok(
  $$ select join_event_group('f0000000-0000-0000-0000-00000000000e') $$,
  'P0001',
  'not a participant of this event',
  'an unrelated user cannot join an event''s group chat'
);

select tests.login_as('f1111111-0000-0000-0000-000000000001');
select lives_ok(
  $$ select join_event_group('f0000000-0000-0000-0000-00000000000e') $$,
  'the organizer can join their own event''s group chat'
);

select tests.login_as('f4444444-0000-0000-0000-000000000004');
select lives_ok(
  $$ select join_event_group('f0000000-0000-0000-0000-00000000000e') $$,
  'an explicitly-invited user can join the event''s group chat'
);

-- the bookings trigger should already have seated both attendees, with
-- no explicit join_event_group() call from either of them
set local role postgres;
select is(
  (select count(*)::int from conversation_participants cp
     join conversations c on c.id = cp.conversation_id
     where c.kind = 'event_group' and c.source_id = 'f0000000-0000-0000-0000-00000000000e'
       and cp.user_id = 'f2222222-0000-0000-0000-000000000002'),
  1,
  'a booking flipping to confirmed (UPDATE) auto-joins the event group chat'
);
select is(
  (select count(*)::int from conversation_participants cp
     join conversations c on c.id = cp.conversation_id
     where c.kind = 'event_group' and c.source_id = 'f0000000-0000-0000-0000-00000000000e'
       and cp.user_id = 'f7777777-0000-0000-0000-000000000007'),
  1,
  'a booking inserted already-confirmed (INSERT) auto-joins the event group chat'
);

-- ─── join_party_group() / auto-membership ────────────────────────
select tests.login_as('f3333333-0000-0000-0000-000000000003');
select throws_ok(
  $$ select join_party_group('f0000000-0000-0000-0000-00000000000d') $$,
  'P0001',
  'not a participant of this party',
  'an unrelated user cannot join a party''s group chat'
);

set local role postgres;
select is(
  (select count(*)::int from conversation_participants cp
     join conversations c on c.id = cp.conversation_id
     where c.kind = 'party_group' and c.source_id = 'f0000000-0000-0000-0000-00000000000d'
       and cp.user_id = 'f6666666-0000-0000-0000-000000000006'),
  1,
  'a linked, rsvp-yes party guest is auto-joined to the party group chat'
);

select tests.login_as('f5555555-0000-0000-0000-000000000005');
select lives_ok(
  $$ select join_party_group('f0000000-0000-0000-0000-00000000000d') $$,
  'the party host can join their own party''s group chat'
);

-- ─── send_message() ──────────────────────────────────────────────
select tests.login_as('f1111111-0000-0000-0000-000000000001');
select lives_ok(
  $$ select send_message(
       (select id from conversations where kind = 'event_group' and source_id = 'f0000000-0000-0000-0000-00000000000e'),
       'Welcome!', null
     ) $$,
  'an event group participant can send a message'
);

select tests.login_as('f3333333-0000-0000-0000-000000000003');
select throws_ok(
  $$ select send_message(
       (select id from conversations where kind = 'event_group' and source_id = 'f0000000-0000-0000-0000-00000000000e'),
       'hi', null
     ) $$,
  'P0001',
  'not a participant of this conversation',
  'a non-participant cannot send a message into the event group chat'
);

-- ─── blocking ─────────────────────────────────────────────────────
select tests.login_as('f2222222-0000-0000-0000-000000000002');
select lives_ok(
  $$ select block_user('f7777777-0000-0000-0000-000000000007') $$,
  'a user can block another user they share an event with'
);
select ok(
  is_blocked_either_way('f2222222-0000-0000-0000-000000000002', 'f7777777-0000-0000-0000-000000000007'),
  'is_blocked_either_way is true in either direction after a block'
);
select ok(
  is_blocked_either_way('f7777777-0000-0000-0000-000000000007', 'f2222222-0000-0000-0000-000000000002'),
  'is_blocked_either_way is symmetric'
);

-- the blocked user cannot see that they were blocked (one-directional visibility)
select tests.login_as('f7777777-0000-0000-0000-000000000007');
select is(
  (select count(*)::int from blocks where blocked_id = 'f7777777-0000-0000-0000-000000000007'),
  0,
  'the blocked user cannot see the block row naming them'
);

-- a blocked pair (who do share an event) cannot start or continue a DM
select tests.login_as('f2222222-0000-0000-0000-000000000002');
select throws_ok(
  $$ select start_or_get_dm('f7777777-0000-0000-0000-000000000007') $$,
  'P0001',
  'cannot message this user',
  'a blocked pair cannot start a DM even though they share an event'
);

-- get a DM conversation going between two OTHER, unblocked users who
-- share the event, to prove send_message()'s own block check fires too
select tests.login_as('f1111111-0000-0000-0000-000000000001');
select start_or_get_dm('f2222222-0000-0000-0000-000000000002');
select tests.login_as('f2222222-0000-0000-0000-000000000002');
select block_user('f1111111-0000-0000-0000-000000000001');
select throws_ok(
  $$ select send_message(
       (select id from conversations where kind = 'dm'
          and ((dm_user_a = 'f1111111-0000-0000-0000-000000000001' and dm_user_b = 'f2222222-0000-0000-0000-000000000002')
            or (dm_user_a = 'f2222222-0000-0000-0000-000000000002' and dm_user_b = 'f1111111-0000-0000-0000-000000000001'))),
       'hey', null
     ) $$,
  'P0001',
  'cannot message this user',
  'send_message refuses a DM once either side has blocked the other'
);
select unblock_user('f1111111-0000-0000-0000-000000000001');

-- ─── reporting ────────────────────────────────────────────────────
select tests.login_as('f3333333-0000-0000-0000-000000000003');
select lives_ok(
  $$ select report_content('user', 'f7777777-0000-0000-0000-000000000007', 'spam') $$,
  'any signed-in user can file a report'
);
select is(
  (select count(*)::int from reports where reporter_id = 'f3333333-0000-0000-0000-000000000003'),
  1,
  'the reporter can see their own report'
);

select tests.login_as('f2222222-0000-0000-0000-000000000002');
select is(
  (select count(*)::int from reports where reporter_id = 'f3333333-0000-0000-0000-000000000003'),
  0,
  'an unrelated, non-admin user cannot see someone else''s report'
);

select tests.login_as('f8888888-0000-0000-0000-000000000008');
select ok(
  (select count(*)::int from reports) >= 1,
  'an admin can see all reports'
);

-- ─── party_guests.user_id linking ────────────────────────────────
select tests.login_as('f5555555-0000-0000-0000-000000000005');
select lives_ok(
  $$ select add_party_guest_by_user('f0000000-0000-0000-0000-00000000000d', 'f3333333-0000-0000-0000-000000000003') $$,
  'a host can add a known Sanatix user straight to their guest list'
);
select ok(
  users_share_event('f5555555-0000-0000-0000-000000000005', 'f3333333-0000-0000-0000-000000000003'),
  'a guest added via add_party_guest_by_user immediately shares the party'
);

-- ─── chat-media storage bucket RLS ────────────────────────────────
-- (looked up as postgres into a psql variable, not a temp table --
-- a temp table owned by postgres isn't readable once the session
-- role switches to authenticated/anon; and the id can't be looked up
-- inline under the non-participant's own login below, since that
-- user can't even see the conversations row under its own RLS policy)
set local role postgres;
select id::text as event_conv_id from conversations
  where kind = 'event_group' and source_id = 'f0000000-0000-0000-0000-00000000000e' \gset

select tests.login_as('f1111111-0000-0000-0000-000000000001');
select lives_ok(
  format($$ insert into storage.objects (bucket_id, name, owner) values ('chat-media', %L, auth.uid()) $$,
    :'event_conv_id' || '/pic.jpg'),
  'an event group participant can write an object into that conversation''s chat-media folder'
);

select tests.login_as('f3333333-0000-0000-0000-000000000003');
select throws_ok(
  format($$ insert into storage.objects (bucket_id, name, owner) values ('chat-media', %L, auth.uid()) $$,
    :'event_conv_id' || '/pic2.jpg'),
  '42501',
  null,
  'a non-participant cannot write into another conversation''s chat-media folder'
);

select * from finish();
rollback;
