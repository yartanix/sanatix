-- Fix: handle_new_user() trigger was failing all signups in production with
-- "Database error saving new user" / SQLSTATE 42704 "type user_role does not exist".
--
-- Root cause: handle_new_user() is SECURITY DEFINER but had no explicit
-- search_path set. It fires under the supabase_auth_admin role (used by
-- GoTrue/Supabase Auth when inserting into auth.users), whose role-level
-- search_path is restricted to `auth` only (no `public`). The function's
-- unqualified casts to the `user_role` enum (which lives in `public`) could
-- therefore not be resolved, aborting the entire signup transaction for
-- every new user, on both the web and mobile apps.
--
-- Fix: pin the function's search_path explicitly and schema-qualify the
-- enum type everywhere it's referenced, so the function's behavior no
-- longer depends on the calling role's own search_path.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  requested_role text := new.raw_user_meta_data->>'role';
  resolved_role  public.user_role;
begin
  resolved_role := case
    when requested_role in ('organizer', 'supplier') then requested_role::public.user_role
    else 'customer'::public.user_role
  end;

  insert into profiles (id, full_name, avatar_url, phone, role)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    new.raw_user_meta_data->>'phone',
    resolved_role
  );
  return new;
end;
$function$;
