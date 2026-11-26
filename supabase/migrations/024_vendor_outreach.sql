-- Vendor outreach: lets "Ali", the automated account-manager agent, invite
-- vendors to verify/register without any manual, per-vendor work.
--
-- vendors had no email column at all (only owner_id, which for every one
-- of today's 202 vendors points at the single content-agent system profile
-- — these are scraped business listings, not accounts anyone has signed
-- into). contact_email is the address Ali actually emails; it's populated
-- either by the content-agent's research step when a vendor is first
-- discovered (see src/lib/agents/content-agent.ts), or later by hand/an
-- enrichment pass for vendors that already exist without one.
--
-- outreach_sent_at / outreach_status make the agent idempotent: each
-- vendor gets at most one invitation unless the status is explicitly
-- reset, so re-running the cron (or running it daily) never double-emails
-- anyone.

alter table public.vendors
  add column if not exists contact_email   text,
  add column if not exists outreach_sent_at timestamptz,
  add column if not exists outreach_status  text
    check (outreach_status in ('sent', 'failed', 'bounced'));

comment on column public.vendors.contact_email is
  'Public contact email for this vendor, used by the Ali account-manager agent. Never shown to site visitors.';
comment on column public.vendors.outreach_sent_at is
  'When Ali last emailed this vendor inviting them to verify/register. Null = never contacted.';
comment on column public.vendors.outreach_status is
  'Outcome of the most recent outreach attempt: sent, failed, or bounced.';

-- Ali's query (contact_email is not null, outreach_sent_at is null) hits
-- this on every run — index it so the batch select stays cheap as the
-- vendors table grows.
create index if not exists vendors_outreach_pending_idx
  on public.vendors (id)
  where contact_email is not null and outreach_sent_at is null;
