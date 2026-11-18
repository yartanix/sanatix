-- Enable Supabase Realtime (Postgres logical replication) on the
-- community-messaging tables from migration 021, so the chat UI can
-- subscribe to new messages/participants instead of polling.
--
-- Supabase projects publish through a "supabase_realtime" publication
-- that starts out empty (or with a provider-chosen table set) -- tables
-- aren't included automatically just because RLS allows SELECT on them.
-- Guarded with a check for the publication's existence because a plain
-- local Postgres (used for this migration's own pgTAP tests) has no such
-- publication at all; this is a strict no-op there.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
    ) then
      alter publication supabase_realtime add table messages;
    end if;

    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'conversation_participants'
    ) then
      alter publication supabase_realtime add table conversation_participants;
    end if;
  end if;
end;
$$;
