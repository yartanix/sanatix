-- In-app account deletion (App Store Review Guideline 5.1.1(v) / Google Play
-- account-deletion policy): any app that lets someone create an account must
-- let them delete it from inside the app, not only by emailing support.
--
-- delete_my_account() deletes the *calling* user's own auth.users row. There
-- is deliberately no user-id parameter -- the target is always auth.uid(), so
-- one user can never delete another, whatever they send over PostgREST.
--
-- Deleting auth.users cascades to profiles, and from there to everything the
-- account owns (parties + guest lists, push tokens, favorites, events, ticket
-- types, vendors, campaigns). Three tables reference a user with no ON DELETE
-- rule -- bookings, contributions, reviews -- so the caller's own rows there
-- are removed explicitly first.
--
-- One case is refused instead of cascaded: an organizer whose events hold
-- other people's live (non-cancelled) bookings, or whose campaigns hold other
-- people's contributions. Deleting that account would silently destroy other
-- users' tickets/pledges, so the function raises ACCOUNT_HAS_ACTIVE_COMMITMENTS
-- and the app tells the organizer to cancel those events first or contact
-- support@sanatix.net.

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  if exists (
       select 1
       from bookings b
       join events e on e.id = b.event_id
       where e.organizer_id = uid
         and b.user_id <> uid
         and b.status <> 'cancelled'
     )
     or exists (
       select 1
       from contributions c
       join campaigns g on g.id = c.campaign_id
       where g.organizer_id = uid
         and c.user_id <> uid
     )
  then
    raise exception 'ACCOUNT_HAS_ACTIVE_COMMITMENTS'
      using errcode = 'P0001',
            hint = 'Other people hold bookings or contributions on this account''s events or campaigns.';
  end if;

  delete from reviews where user_id = uid;
  delete from contributions where user_id = uid;
  delete from bookings
   where user_id = uid
      or event_id in (select id from events where organizer_id = uid);

  delete from auth.users where id = uid;
end;
$function$;

revoke all on function public.delete_my_account() from public;
revoke all on function public.delete_my_account() from anon;
grant execute on function public.delete_my_account() to authenticated;
