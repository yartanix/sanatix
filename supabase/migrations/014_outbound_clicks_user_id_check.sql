-- ============================================================
-- SANATIX — Migration 014
-- Security audit finding (API route pass): outbound_clicks' insert
-- policy (migration 010) is `with check (true)` — deliberately wide
-- open so anonymous visitors can log a click, which is correct. But
-- it means a direct PostgREST call (bypassing /api/track/outbound,
-- which only ever sets user_id from the caller's own verified session
-- or null) can insert a row with ANY user_id, attributing a click to
-- a real other user. Low severity — outbound_clicks is write-only
-- analytics, nobody but an admin can ever read it back, and nothing
-- here exposes any other user's data — but it's a real integrity gap
-- with a one-line fix, so it's closed along with the rest of this
-- pass: a logged-in caller can only log a click as themselves (or
-- anonymously, by leaving user_id null); they can never log one as
-- somebody else.
-- ============================================================

drop policy if exists "anyone can log an outbound click" on outbound_clicks;
create policy "anyone can log an outbound click"
  on outbound_clicks for insert
  with check (user_id is null or user_id = auth.uid());
