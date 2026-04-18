-- ============================================================
-- SANATIX — Database Schema v1.0
-- ============================================================

-- ─── Extensions ─────────────────────────────────────────────
create extension if not exists "uuid-ossp";
create extension if not exists "postgis";        -- for geo queries
create extension if not exists "pg_cron";        -- for scheduled jobs

-- ─── Enums ──────────────────────────────────────────────────
create type user_role       as enum ('customer','supplier','organizer','admin','influencer');
create type event_status    as enum ('draft','published','cancelled','completed');
create type ticket_status   as enum ('available','sold_out','reserved');
create type booking_status  as enum ('pending','confirmed','cancelled','refunded');
create type campaign_status as enum ('active','funded','expired','cancelled');
create type currency_code   as enum ('SAR','AED','KWD','QAR','USD');

-- ─── Profiles ───────────────────────────────────────────────
create table profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  full_name     text,
  phone         text,
  avatar_url    text,
  role          user_role not null default 'customer',
  locale        text not null default 'ar' check (locale in ('ar','en')),
  city          text,
  country       text not null default 'SA',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ─── Events ─────────────────────────────────────────────────
create table events (
  id              uuid primary key default uuid_generate_v4(),
  organizer_id    uuid not null references profiles(id) on delete cascade,
  title_ar        text not null,
  title_en        text not null,
  description_ar  text,
  description_en  text,
  cover_image     text,
  venue_name      text,
  venue_city      text not null,
  venue_country   text not null default 'SA',
  venue_lat       double precision,
  venue_lng       double precision,
  starts_at       timestamptz not null,
  ends_at         timestamptz not null,
  status          event_status not null default 'draft',
  is_featured     boolean not null default false,
  is_free         boolean not null default false,
  category        text not null,
  tags            text[] default '{}',
  view_count      integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ─── Ticket Types ────────────────────────────────────────────
create table ticket_types (
  id              uuid primary key default uuid_generate_v4(),
  event_id        uuid not null references events(id) on delete cascade,
  name_ar         text not null,
  name_en         text not null,
  description_ar  text,
  description_en  text,
  price           numeric(10,2) not null default 0,
  currency        currency_code not null default 'SAR',
  total_quantity  integer not null,
  sold_quantity   integer not null default 0,
  status          ticket_status not null default 'available',
  sale_starts_at  timestamptz,
  sale_ends_at    timestamptz,
  created_at      timestamptz not null default now()
);

-- ─── Bookings ────────────────────────────────────────────────
create table bookings (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references profiles(id),
  ticket_type_id  uuid not null references ticket_types(id),
  event_id        uuid not null references events(id),
  quantity        integer not null default 1,
  total_amount    numeric(10,2) not null,
  currency        currency_code not null default 'SAR',
  status          booking_status not null default 'pending',
  qr_code         text unique,
  payment_ref     text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ─── Vendors ─────────────────────────────────────────────────
create table vendors (
  id              uuid primary key default uuid_generate_v4(),
  owner_id        uuid not null references profiles(id) on delete cascade,
  name_ar         text not null,
  name_en         text not null,
  description_ar  text,
  description_en  text,
  logo_url        text,
  cover_url       text,
  category        text not null,
  city            text not null,
  country         text not null default 'SA',
  is_verified     boolean not null default false,
  is_featured     boolean not null default false,
  is_premium      boolean not null default false,
  rating          numeric(3,2),
  review_count    integer not null default 0,
  instagram_url   text,
  whatsapp        text,
  website_url     text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ─── Crowdfunding Campaigns ───────────────────────────────────
create table campaigns (
  id              uuid primary key default uuid_generate_v4(),
  organizer_id    uuid not null references profiles(id) on delete cascade,
  event_id        uuid references events(id),
  title_ar        text not null,
  title_en        text not null,
  description_ar  text,
  description_en  text,
  cover_image     text,
  goal_amount     numeric(12,2) not null,
  raised_amount   numeric(12,2) not null default 0,
  currency        currency_code not null default 'SAR',
  deadline        timestamptz not null,
  status          campaign_status not null default 'active',
  backer_count    integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ─── Campaign Contributions ──────────────────────────────────
create table contributions (
  id              uuid primary key default uuid_generate_v4(),
  campaign_id     uuid not null references campaigns(id) on delete cascade,
  user_id         uuid not null references profiles(id),
  amount          numeric(10,2) not null,
  currency        currency_code not null default 'SAR',
  is_anonymous    boolean not null default false,
  payment_ref     text,
  created_at      timestamptz not null default now()
);

-- ─── Reviews ─────────────────────────────────────────────────
create table reviews (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references profiles(id),
  vendor_id   uuid references vendors(id) on delete cascade,
  event_id    uuid references events(id) on delete cascade,
  rating      smallint not null check (rating between 1 and 5),
  comment_ar  text,
  comment_en  text,
  created_at  timestamptz not null default now(),
  constraint one_target check (
    (vendor_id is not null)::int + (event_id is not null)::int = 1
  )
);

-- ─── Indexes ─────────────────────────────────────────────────
create index idx_events_status        on events(status);
create index idx_events_starts_at     on events(starts_at);
create index idx_events_organizer     on events(organizer_id);
create index idx_events_city          on events(venue_city);
create index idx_events_featured      on events(is_featured) where is_featured = true;
create index idx_ticket_types_event   on ticket_types(event_id);
create index idx_bookings_user        on bookings(user_id);
create index idx_bookings_event       on bookings(event_id);
create index idx_vendors_category     on vendors(category);
create index idx_vendors_city         on vendors(city);
create index idx_vendors_featured     on vendors(is_featured) where is_featured = true;
create index idx_campaigns_status     on campaigns(status);

-- ─── RLS (Row Level Security) ─────────────────────────────────
alter table profiles      enable row level security;
alter table events        enable row level security;
alter table ticket_types  enable row level security;
alter table bookings      enable row level security;
alter table vendors       enable row level security;
alter table campaigns     enable row level security;
alter table contributions enable row level security;
alter table reviews       enable row level security;

-- Profiles: users can read all, update only their own
create policy "profiles_read_all"   on profiles for select using (true);
create policy "profiles_update_own" on profiles for update using (auth.uid() = id);

-- Events: anyone can read published events, organizers manage their own
create policy "events_read_published" on events for select using (status = 'published');
create policy "events_manage_own"     on events for all   using (auth.uid() = organizer_id);

-- Ticket types: public read for published events
create policy "ticket_types_read" on ticket_types for select using (
  exists (select 1 from events where id = event_id and status = 'published')
);

-- Bookings: users see only their own
create policy "bookings_own" on bookings for all using (auth.uid() = user_id);

-- Vendors: anyone can read, owners manage their own
create policy "vendors_read_all"  on vendors for select using (true);
create policy "vendors_manage_own" on vendors for all  using (auth.uid() = owner_id);

-- Campaigns: public read active, owners manage their own
create policy "campaigns_read_active" on campaigns for select using (status = 'active');
create policy "campaigns_manage_own"  on campaigns for all   using (auth.uid() = organizer_id);

-- Reviews: public read, users manage their own
create policy "reviews_read_all"  on reviews for select using (true);
create policy "reviews_manage_own" on reviews for all   using (auth.uid() = user_id);

-- ─── Trigger: auto-create profile on signup ──────────────────
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, full_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ─── Trigger: update updated_at ──────────────────────────────
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at_profiles  before update on profiles  for each row execute procedure set_updated_at();
create trigger set_updated_at_events    before update on events    for each row execute procedure set_updated_at();
create trigger set_updated_at_bookings  before update on bookings  for each row execute procedure set_updated_at();
create trigger set_updated_at_vendors   before update on vendors   for each row execute procedure set_updated_at();
create trigger set_updated_at_campaigns before update on campaigns for each row execute procedure set_updated_at();
