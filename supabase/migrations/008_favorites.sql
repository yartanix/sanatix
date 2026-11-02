-- Saved/favorited events, backing the heart button on the event page
-- (previously decorative — no table, no handler).

create table favorites (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references profiles(id) on delete cascade,
  event_id   uuid not null references events(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, event_id)
);

create index idx_favorites_user on favorites(user_id);

alter table favorites enable row level security;

create policy "favorites_own" on favorites for all using (auth.uid() = user_id);
