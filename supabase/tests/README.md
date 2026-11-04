# Database / RLS tests (pgTAP)

Real, executable tests for the Row Level Security policies in
`supabase/schema.sql` and `supabase/migrations/*.sql` — the actual
authorization boundary for this app, since most API routes and server
components query Supabase with the logged-in user's own session rather
than re-checking ownership in application code.

This does **not** need a Supabase project, a service-role key, or network
access — it runs against a disposable local Postgres with the real
schema/migrations loaded onto it, so it's safe to run anywhere, including
CI, with nothing but Postgres itself.

## What it covers

- **`rls/bookings.sql`** — a booking's owner can read/update it; the
  event's organizer can read (but not modify) it for their attendee list;
  an unrelated user or an anonymous visitor sees nothing.
- **`rls/outbound_clicks.sql`** — anyone (including anonymous visitors)
  can log a click, but only an admin can read the analytics back — not
  even the person who logged the click.
- **`rls/parties_and_rsvp.sql`** — a party host can fully manage their own
  parties/guest list; a different host, or anon, has zero direct table
  access; the public, token-gated `get_rsvp_details()` RPC returns exactly
  one guest's row for the correct token and nothing for a wrong one.
- **`rls/rsvp_actions_and_push_tokens.sql`** — the `submit_rsvp()` RPC
  actually updates the right row for a correct token, raises (rather than
  silently no-op'ing) for a wrong token or an invalid status value; a
  user's push token is readable only by that same user.

## How it works

Supabase manages an `auth` schema (with `auth.users`, `auth.uid()`, etc.)
that doesn't exist on a plain Postgres instance. `fixtures/local_auth_shim.sql`
is a minimal stand-in — just enough for `schema.sql`'s foreign keys and
`handle_new_user()` trigger to work, and for `auth.uid()` to read from a
Postgres session setting the same way PostgREST sets it from a real JWT on
every request against the live project.

`fixtures/test_helpers.sql` adds `tests.login_as(user_id)` /
`tests.logout()` so each test can flip between "acting as this user" and
"acting as an anonymous visitor" and have the exact same RLS policies
apply as they would in production.

**Never load `fixtures/local_auth_shim.sql` into a real database** — it's
a stand-in for local testing only, not something that belongs anywhere
near the actual Supabase project.

## Running it locally

Needs Postgres 16 + the `pgtap` extension (`apt-get install postgresql-16
postgresql-16-pgtap postgresql-16-postgis-3 postgresql-16-cron pgtap`, or
your platform's equivalent — `postgis`/`pg_cron` are only needed because
`schema.sql` enables them, nothing in these tests actually exercises
geo queries or cron jobs).

```bash
createdb sanatix_test

psql -d sanatix_test -f supabase/tests/fixtures/local_auth_shim.sql
psql -d sanatix_test -f supabase/schema.sql
for f in supabase/migrations/*.sql; do psql -d sanatix_test -f "$f"; done
psql -d sanatix_test -f supabase/tests/fixtures/grants.sql
psql -d sanatix_test -f supabase/tests/fixtures/test_helpers.sql
psql -d sanatix_test -c "create extension if not exists pgtap;"

pg_prove -d sanatix_test supabase/tests/rls/*.sql
```

Every test file wraps itself in `begin; ... rollback;`, so running them
leaves no data behind and they can be re-run freely against the same
database.

## CI

`.github/workflows/db-tests.yml` runs exactly the steps above on every
pull request that touches `supabase/`.
