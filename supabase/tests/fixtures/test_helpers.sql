-- Test-only helpers for impersonating a Postgres role inside a pgTAP test,
-- the same way PostgREST sets request.jwt.claim.sub/role from a real JWT
-- for every request against the live Supabase project. Never load this
-- into a real database -- it's for the local test DB only (see
-- supabase/tests/README.md).

create schema if not exists tests;

create or replace function tests.login_as(target_user_id uuid) returns void as $$
begin
  perform set_config('request.jwt.claim.sub', target_user_id::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;
end;
$$ language plpgsql;

create or replace function tests.logout() returns void as $$
begin
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claim.role', 'anon', true);
  set local role anon;
end;
$$ language plpgsql;

grant usage on schema tests to anon, authenticated;
grant execute on function tests.login_as(uuid) to anon, authenticated;
grant execute on function tests.logout() to anon, authenticated;
