-- Fixes a registration bug found while adding "Register now" entry
-- points across the apps: handle_new_user() (defined in schema.sql,
-- the base schema — this migration is the correct place to change it
-- going forward) only ever copied full_name/avatar_url from
-- new.raw_user_meta_data into the new profiles row. It silently
-- dropped `phone` and — more importantly — `role`, even though the
-- web register page has asked "I am joining as a customer / organizer
-- / supplier" and sent that choice along since it was written.
-- Every self-registered account has therefore always landed as
-- 'customer' regardless of what was picked, with no error and no
-- visible sign anything was wrong — purely cosmetic role selection.
--
-- Safe to fix now because this function already runs `security
-- definer`, i.e. in a privileged context — exactly the kind of
-- "privileged path" migration 013's enforce_profiles_role_protection()
-- trigger comment already assumed this function would be, had it ever
-- actually set a role. Self-registration is still only ever allowed to
-- pick customer/organizer/supplier — never 'admin' or 'influencer',
-- regardless of what a client sends in signup metadata.

create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
declare
  requested_role text := new.raw_user_meta_data->>'role';
  resolved_role  user_role;
begin
  resolved_role := case
    when requested_role in ('organizer', 'supplier') then requested_role::user_role
    else 'customer'::user_role
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
$$;

-- Trigger itself (on_auth_user_created, from schema.sql) already
-- points at this function by name — no change needed there.
