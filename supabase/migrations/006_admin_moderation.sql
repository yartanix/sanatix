-- ============================================================
-- SANATIX — Migration 006
-- Admin moderation: RLS so an admin can actually act on the
-- review queue (verify/reject vendors, unpublish agent content).
--
-- Why this is needed: migration 005 added "venues_manage_admin",
-- but events and vendors never got the equivalent. Today an admin
-- user (profiles.role = 'admin') can read everything but can only
-- UPDATE/DELETE a vendor row they personally own (vendors_manage_own)
-- or an event they personally organize (events_manage_own) — there
-- is no policy letting them moderate anyone else's row. Without this,
-- /admin's verify/reject/unpublish buttons 403 against RLS for every
-- row an admin doesn't themselves own, which in practice is all of
-- them (agent-generated rows are owned by a system account).
--
-- This mirrors venues_manage_admin exactly — same admin check, same
-- "for all" scope (select/insert/update/delete) — just extended to
-- the two tables that were missing it.
-- ============================================================

create policy "events_manage_admin" on events for all using (
  exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin')
);

create policy "vendors_manage_admin" on vendors for all using (
  exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin')
);
