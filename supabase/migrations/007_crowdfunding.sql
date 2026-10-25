-- ============================================================
-- SANATIX — Migration 007
-- Turn on the crowdfunding tables (campaigns, contributions) that
-- have existed since schema.sql but were never wired up to a route.
--
-- What's missing today:
--   1. contributions has RLS enabled (schema.sql) but ZERO policies
--      — with RLS on and no policies, Postgres denies everything by
--      default, including reads, even to the row's own owner. Right
--      now nobody can back a campaign or see their own pledge.
--   2. campaigns_read_active (schema.sql) only lets the public see
--      status = 'active' campaigns. A campaign that reached its goal
--      or ran out of time should still be viewable (its own page,
--      and a "past campaigns" section) — just not backable.
--   3. Nothing keeps campaigns.raised_amount / backer_count in sync
--      with contributions. Rather than trust the client or add an
--      RPC like create_bookings(), a trigger does it server-side on
--      insert, and flips the campaign to 'funded' when the goal is
--      reached — contributions have no quantity/stock to race on
--      (unlike ticket_types), so a simple trigger is enough; no
--      locking needed.
-- ============================================================

-- ─── 1. Let the public see resolved campaigns too ─────────────
create policy "campaigns_read_resolved" on campaigns for select using (
  status in ('funded', 'expired')
);

-- ─── 2. Contributions: user can back a campaign and see their own
--        pledges; a campaign's organizer can see who backed it ───
create policy "contributions_insert_own" on contributions for insert with check (
  auth.uid() = user_id
);

create policy "contributions_read_own" on contributions for select using (
  auth.uid() = user_id
  or exists (
    select 1 from campaigns
    where campaigns.id = contributions.campaign_id
      and campaigns.organizer_id = auth.uid()
  )
);

-- ─── 3. Keep campaigns.raised_amount / backer_count in sync ───
create or replace function apply_contribution_to_campaign() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update campaigns
  set raised_amount = raised_amount + new.amount,
      backer_count   = backer_count + 1,
      status         = case
                          when raised_amount + new.amount >= goal_amount and status = 'active'
                          then 'funded'
                          else status
                        end
  where id = new.campaign_id;
  return new;
end $$;

create trigger trg_apply_contribution after insert on contributions
  for each row execute function apply_contribution_to_campaign();
