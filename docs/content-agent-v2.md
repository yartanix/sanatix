# Content Agent v2 — venues & events feed

Autonomous bot that fills Sanatix with real events and venues. Code lives in
`src/lib/agents/` and runs from `src/app/api/cron/content-agent/route.ts`.

## What it does each run

| Step | KSA run (daily) | GCC run (Thursdays UTC) |
|---|---|---|
| Housekeeping | Agent events whose `ends_at` passed → `status = completed` | same |
| Venues | 1 rotating KSA city (Riyadh → Jeddah → Dammam → Khobar → Makkah → Madinah), up to 8 venues | + 1 rotating GCC city |
| Events | All 6 KSA cities, up to 8 events each, next 60 days | + Dubai, Abu Dhabi, Doha, Manama, Kuwait City |
| Vendors | 1 GCC-wide sweep, 5 vendors, inserted **unverified** | same |

Venue sweeps run before event sweeps so events found in the same run can
link to freshly discovered venues. After each venue sweep the agent also
backfills `events.venue_id` for existing events in that city whose free-text
`venue_name` now matches a venue (name, Arabic name, or alias).

Jobs run 4 at a time with a 220s wall-clock budget (function limit is 300s).
Cities that don't start in time are logged under `skippedCities` in the
run result and simply get picked up next run.

## Publishing policy

Everything that passes validation is **published immediately**:
events as `status = 'published'`, venues as `is_published = true`. Every row
carries `agent_generated = true` and a `source_url`. Guards before publish:

- `starts_at` parses, is ≥ now − 1 day and ≤ now + 400 days; `ends_at` ≥ `starts_at`
- `source_url` / `ticket_url` / `image_url` are http(s) URLs
- `category` ∈ `EVENT_CATEGORIES`, `venue_type` ∈ `VENUE_TYPES`
- events dedup: same `source_url`, or a matching title in the same city within ±2 days
- venues dedup: normalized name/alias match in the same city, plus a DB unique index on `(lower(name_en), lower(city))`

Vendors are the exception and stay `is_verified = false` — they're a
business relationship, not content.

## Setup

1. Run `supabase/migrations/005_venues_and_agent_publishing.sql` in the SQL editor.
2. Env vars on Vercel: `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` (optional),
   `CRON_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`.
3. Cron is already in `vercel.json` (`0 6 * * *` UTC = 09:00 Riyadh).

## Manual runs

```
curl -H "Authorization: Bearer $CRON_SECRET" "https://sanatix.net/api/cron/content-agent?city=Riyadh&events=5&venues=5&vendors=0"
curl -H "Authorization: Bearer $CRON_SECRET" "https://sanatix.net/api/cron/content-agent?scope=gcc"
```

Params: `scope=ksa|gcc`, `city=A,B` (restricts events *and* venues to those
cities), `events=N`, `venues=N` (`0` skips), `vendors=N` (`0` skips).

## Observability

Every run writes one row to `agent_runs` (`agent_name = 'content-agent'`)
with a summary like:

```
[ksa] Published 31 event(s): Riyadh +8, Jeddah +7 (1 dup), … Venues +8: Riyadh +8 (5 events linked). Vendors +4 (unverified). Marked 3 past event(s) completed.
```

The full per-city breakdown is in the JSON the route returns. Rotation
cursors live in `agent_config` (`content_agent_venue_cursor_ksa` / `_gcc`).

## Pulling something the agent got wrong

```sql
update events set status = 'cancelled' where id = '…';
update venues set is_published = false where id = '…';
```

Both stay in the table so the dedup logic won't re-import them.
