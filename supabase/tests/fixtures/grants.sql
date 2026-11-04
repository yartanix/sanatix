-- The real Supabase project grants anon/authenticated base table access
-- automatically (PostgREST's default role setup) -- RLS policies are what
-- actually restrict which rows those roles can see/touch, not table-level
-- grants. Replicate just that baseline here so the RLS policies under
-- test are the only thing deciding pass/fail.
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;
