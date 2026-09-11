import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOrCreateContentAgentProfileId } from "@/lib/agents/system-profile";
import { researchAndExtractJson, runWithBudget } from "@/lib/agents/research";
import { findVenueMatch, sameEventTitle, type MatchableVenue } from "@/lib/agents/venue-matching";
import {
  EVENT_CATEGORIES, VENDOR_CATEGORIES, VENUE_TYPES,
  KSA_CITIES, GCC_CITIES, type SweepCity,
} from "@/lib/constants";

/*
 * ─── Content Agent v2 ────────────────────────────────────────────────
 *
 * Feeds Sanatix with real, currently-scheduled events and real venues,
 * city by city, using Claude + web search. Runs from the Vercel cron
 * route (src/app/api/cron/content-agent/route.ts).
 *
 * Scope per run:
 *   - KSA cities: events sweep EVERY run (daily).
 *   - GCC cities: events sweep only when scope === "gcc" (weekly).
 *   - Venues: ONE city per run, rotating through the scope's cities via a
 *     cursor in agent_config, so every city gets a venue pass every ~6
 *     days (KSA) without blowing the function's time budget.
 *   - Vendors: one small GCC-wide sweep per run (unchanged from v1,
 *     still inserted unverified — vendors are a supply-side business
 *     relationship, not content).
 *
 * Publishing policy (product decision, Sep 2026): everything that passes
 * schema validation + sanity guards is published immediately. Events go
 * in as status='published', venues as is_published=true. Every row is
 * tagged agent_generated=true + source_url so it can be audited or
 * pulled later. The guards are what keep this safe:
 *   - starts_at must parse, be no more than 1 day in the past, and no
 *     more than 400 days out;
 *   - source_url must be http(s);
 *   - category / venue_type must be in our enums;
 *   - dedup against existing rows (title + city + ±2 days for events;
 *     normalized name/alias + city for venues).
 *
 * Every run ends with housekeeping: agent-published events whose
 * ends_at has passed are flipped to 'completed' so the listings never
 * show stale items.
 */

// ─── Schemas ──────────────────────────────────────────────────

const httpUrl = z.string().url().refine((u) => /^https?:\/\//i.test(u), "must be http(s)");

const EventDraftSchema = z.object({
  title_en: z.string().min(3),
  title_ar: z.string().min(2),
  description_en: z.string().min(10),
  description_ar: z.string().min(5),
  venue_name: z.string().nullable().optional(),
  venue_address: z.string().nullable().optional(),
  starts_at: z.string().min(10),
  ends_at: z.string().min(10).nullable().optional(),
  category: z.enum(EVENT_CATEGORIES),
  is_free: z.boolean().default(false),
  ticket_url: httpUrl.nullable().optional(),
  image_url: httpUrl.nullable().optional(),
  source_url: httpUrl,
});
type EventDraft = z.infer<typeof EventDraftSchema>;

const VenueDraftSchema = z.object({
  name_en: z.string().min(2),
  name_ar: z.string().min(2),
  aliases: z.array(z.string()).default([]),
  description_en: z.string().min(10),
  description_ar: z.string().min(5),
  venue_type: z.enum(VENUE_TYPES).default("other"),
  address: z.string().nullable().optional(),
  lat: z.number().nullable().optional(),
  lng: z.number().nullable().optional(),
  capacity_min: z.number().int().nonnegative().nullable().optional(),
  capacity_max: z.number().int().nonnegative().nullable().optional(),
  amenities: z.array(z.string()).default([]),
  website_url: httpUrl.nullable().optional(),
  instagram_url: httpUrl.nullable().optional(),
  google_maps_url: httpUrl.nullable().optional(),
  phone: z.string().nullable().optional(),
  whatsapp: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
  price_range: z.string().nullable().optional(),
  image_url: httpUrl.nullable().optional(),
  source_url: httpUrl,
});
type VenueDraft = z.infer<typeof VenueDraftSchema>;

const VendorDraftSchema = z.object({
  name_en: z.string().min(2),
  name_ar: z.string().min(2),
  description_en: z.string().min(10),
  description_ar: z.string().min(5),
  category: z.enum(VENDOR_CATEGORIES),
  city: z.string().min(2),
  country: z.string().length(2).default("SA"),
  website_url: httpUrl.nullable().optional(),
  instagram_url: httpUrl.nullable().optional(),
  whatsapp: z.string().nullable().optional(),
  source_url: httpUrl,
});
type VendorDraft = z.infer<typeof VendorDraftSchema>;

// ─── Prompts ──────────────────────────────────────────────────

const JSON_ONLY_TAIL = `Respond with AT MOST one sentence of summary, then immediately end your response with ONLY a fenced \`\`\`json code block containing a JSON array of objects with exactly the fields listed. No prose after the block. If you find nothing verifiable, output an empty array \`[]\`.`;

function eventDiscoveryPrompt(city: SweepCity, count: number, knownTitles: string[]): string {
  const today = new Date().toISOString().slice(0, 10);
  const skip = knownTitles.length
    ? `\n\nAlready listed on our site (skip these, find OTHER events):\n${knownTitles.slice(0, 40).map((t) => `- ${t}`).join("\n")}`
    : "";

  return `Today is ${today}. You are researching REAL, publicly announced events happening in ${city.label} in the next 60 days.

Use web search — official event websites, ticketing platforms (webook, Platinumlist, Ticketmaster, HalaYalla, Virgin Megastore Tickets, Eventbrite), venue calendars, the Saudi/GCC events calendars, exhibition organizers, sports federations, concert promoters, and reputable news. Find up to ${count} distinct events: concerts and shows, exhibitions and expos, conferences and summits, sports fixtures, festivals, family entertainment, community and cultural events, corporate/industry events.

HARD RULES:
- Only include events you found real evidence for in a search result. Never invent an event, a date, a venue, or a price. If a fact can't be verified, set it to null or leave the event out.
- The event must start on or after ${today}.
- Prefer events with a confirmed date and a named venue.${skip}

For each event, extract:
- title_en, title_ar (translate naturally if only one language exists)
- description_en, description_ar (1–3 factual sentences: what it is, who it's for, anything notable — no marketing hype)
- venue_name (official venue name, or null), venue_address (street/district, or null)
- starts_at, ends_at (ISO 8601 with timezone offset, e.g. 2026-10-03T19:00:00+03:00; if only a date is known use 19:00 local and say so in the description; ends_at may be null)
- category — exactly one of: ${EVENT_CATEGORIES.join(", ")}
- is_free (boolean)
- ticket_url (where tickets are sold, or null), image_url (official poster/cover image URL if a search result exposed one, else null)
- source_url — the exact page where you verified the event

${JSON_ONLY_TAIL}`;
}

function venueDiscoveryPrompt(city: SweepCity, count: number, knownNames: string[], wanted: string[]): string {
  const skip = knownNames.length
    ? `\n\nAlready in our database (skip these):\n${knownNames.slice(0, 60).map((t) => `- ${t}`).join("\n")}`
    : "";
  const priority = wanted.length
    ? `\n\nPRIORITY: these venue names appear on events we list but we have no venue record yet — research these FIRST, then fill the remaining slots with other notable venues:\n${wanted.slice(0, 15).map((t) => `- ${t}`).join("\n")}`
    : "";

  return `You are building a directory of REAL event venues in ${city.label}: hotel ballrooms, wedding and banquet halls, conference and exhibition centers, arenas and stadiums, theaters, cultural centers, outdoor event grounds, and restaurants/lounges with private event spaces.

Use web search — the venue's own website, Google Maps/Business listings, hotel group sites, tourism authority directories, and reputable wedding/event directories. Find up to ${count} distinct venues.${priority}${skip}

HARD RULES:
- Only include venues you found real evidence for. Never invent an address, phone number, capacity, or price. Unknown → null.
- Every venue must be currently operating.

For each venue, extract:
- name_en, name_ar (official names; translate naturally if only one exists)
- aliases (array of other spellings/short names people use, e.g. ["Riyadh Front Expo", "RFECC"]; [] if none)
- description_en, description_ar (2–3 factual sentences: type of space, what events it hosts, standout features)
- venue_type — exactly one of: ${VENUE_TYPES.join(", ")}
- address (street + district, or null), lat, lng (decimal degrees if a listing shows them, else null)
- capacity_min, capacity_max (people; null if unknown)
- amenities (array of short strings, e.g. ["parking", "catering", "AV equipment", "prayer room"])
- website_url, instagram_url, google_maps_url, phone, whatsapp, email, price_range (each null if not found)
- image_url (a representative photo URL if a search result exposed one, else null)
- source_url — the exact page where you verified the venue

${JSON_ONLY_TAIL}`;
}

function vendorDiscoveryPrompt(cities: SweepCity[], count: number): string {
  return `You are researching REAL event-services businesses (vendors) currently operating in: ${cities.map((c) => c.label).join(", ")}.

Use web search to find up to ${count} real, currently-operating businesses in categories like: ${VENDOR_CATEGORIES.join(", ")}. Only include businesses you found real evidence for (own website, Instagram, Google Business, or a directory listing). Never invent a business or its contact details.

For each business, extract:
- name_en, name_ar
- description_en, description_ar (1–2 honest sentences)
- category — exactly one of: ${VENDOR_CATEGORIES.join(", ")}
- city (one of: ${cities.map((c) => c.name).join(", ")}), country (2-letter code)
- website_url, instagram_url, whatsapp (null if not found)
- source_url — the exact URL where you verified this business

${JSON_ONLY_TAIL}`;
}

// ─── Guards ───────────────────────────────────────────────────

const DAY_MS = 86_400_000;

function parseWhen(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Returns null when an event should not be published, otherwise the
 * normalized dates to store.
 */
function eventDates(draft: EventDraft): { starts: Date; ends: Date } | null {
  const starts = parseWhen(draft.starts_at);
  if (!starts) return null;
  const now = Date.now();
  if (starts.getTime() < now - DAY_MS) return null;          // already happened
  if (starts.getTime() > now + 400 * DAY_MS) return null;    // implausibly far out
  let ends = parseWhen(draft.ends_at) ?? new Date(starts.getTime() + 3 * 60 * 60 * 1000);
  if (ends.getTime() < starts.getTime()) ends = new Date(starts.getTime() + 3 * 60 * 60 * 1000);
  if (ends.getTime() - starts.getTime() > 120 * DAY_MS) ends = new Date(starts.getTime() + 120 * DAY_MS);
  return { starts, ends };
}

// ─── DB helpers ───────────────────────────────────────────────

type Admin = SupabaseClient;

async function loadCityVenues(db: Admin, city: SweepCity): Promise<MatchableVenue[]> {
  const { data } = await db
    .from("venues")
    .select("id, name_en, name_ar, aliases")
    .eq("city", city.name);
  return (data ?? []) as MatchableVenue[];
}

async function loadUpcomingTitles(db: Admin, city: SweepCity): Promise<string[]> {
  const { data } = await db
    .from("events")
    .select("title_en")
    .eq("venue_city", city.name)
    .gte("starts_at", new Date(Date.now() - DAY_MS).toISOString())
    .order("starts_at", { ascending: true })
    .limit(80);
  return (data ?? []).map((r) => r.title_en as string);
}

/** Venue names used by events in this city that aren't linked to a venue row yet. */
async function loadUnlinkedVenueNames(db: Admin, city: SweepCity): Promise<string[]> {
  const { data } = await db
    .from("events")
    .select("venue_name")
    .eq("venue_city", city.name)
    .is("venue_id", null)
    .not("venue_name", "is", null)
    .gte("starts_at", new Date(Date.now() - DAY_MS).toISOString())
    .limit(100);
  const seen = new Set<string>();
  for (const r of data ?? []) {
    const n = (r.venue_name as string | null)?.trim();
    if (n) seen.add(n);
  }
  return [...seen];
}

async function isDuplicateEvent(db: Admin, draft: EventDraft, city: SweepCity, starts: Date): Promise<boolean> {
  const { data: bySource } = await db
    .from("events").select("id").eq("source_url", draft.source_url).limit(1);
  if (bySource && bySource.length > 0) return true;

  const { data: nearby } = await db
    .from("events")
    .select("id, title_en, title_ar")
    .eq("venue_city", city.name)
    .gte("starts_at", new Date(starts.getTime() - 2 * DAY_MS).toISOString())
    .lte("starts_at", new Date(starts.getTime() + 2 * DAY_MS).toISOString())
    .limit(200);

  return (nearby ?? []).some(
    (e) => sameEventTitle(e.title_en as string, draft.title_en) || sameEventTitle(e.title_ar as string, draft.title_ar)
  );
}

// ─── Per-city event sweep ─────────────────────────────────────

export interface CityEventStats {
  city: string;
  found: number;
  invalid: number;
  rejected: number;   // failed date/sanity guards
  duplicates: number;
  published: number;
  linkedToVenue: number;
  error?: string;
}

async function sweepCityEvents(db: Admin, city: SweepCity, organizerId: string, count: number): Promise<CityEventStats> {
  const stats: CityEventStats = { city: city.name, found: 0, invalid: 0, rejected: 0, duplicates: 0, published: 0, linkedToVenue: 0 };

  const [knownTitles, venues] = await Promise.all([loadUpcomingTitles(db, city), loadCityVenues(db, city)]);
  const research = await researchAndExtractJson(eventDiscoveryPrompt(city, count, knownTitles), 10);
  stats.found = research.items.length;

  for (const item of research.items) {
    const parsed = EventDraftSchema.safeParse(item);
    if (!parsed.success) { stats.invalid++; continue; }
    const draft = parsed.data;

    const dates = eventDates(draft);
    if (!dates) { stats.rejected++; continue; }

    if (await isDuplicateEvent(db, draft, city, dates.starts)) { stats.duplicates++; continue; }

    const venue = findVenueMatch(draft.venue_name, venues);

    const { error } = await db.from("events").insert({
      organizer_id: organizerId,
      title_en: draft.title_en,
      title_ar: draft.title_ar,
      description_en: draft.description_en,
      description_ar: draft.description_ar,
      cover_image: draft.image_url ?? null,
      venue_name: draft.venue_name ?? null,
      venue_city: city.name,
      venue_country: city.country,
      venue_id: venue?.id ?? null,
      starts_at: dates.starts.toISOString(),
      ends_at: dates.ends.toISOString(),
      status: "published",
      is_free: draft.is_free,
      category: draft.category,
      ticket_url: draft.ticket_url ?? null,
      source_url: draft.source_url,
      agent_generated: true,
    });

    if (error) {
      console.error(`[content-agent] event insert failed (${city.name}):`, draft.title_en, error.message);
      stats.rejected++;
    } else {
      stats.published++;
      if (venue) stats.linkedToVenue++;
    }
  }

  return stats;
}

// ─── Per-city venue sweep ─────────────────────────────────────

export interface CityVenueStats {
  city: string;
  found: number;
  invalid: number;
  duplicates: number;
  published: number;
  eventsLinked: number;   // pre-existing events linked to venues after this sweep
  error?: string;
}

async function sweepCityVenues(db: Admin, city: SweepCity, creatorId: string, count: number): Promise<CityVenueStats> {
  const stats: CityVenueStats = { city: city.name, found: 0, invalid: 0, duplicates: 0, published: 0, eventsLinked: 0 };

  const existing = await loadCityVenues(db, city);
  const wanted = await loadUnlinkedVenueNames(db, city);
  const research = await researchAndExtractJson(
    venueDiscoveryPrompt(city, count, existing.map((v) => v.name_en), wanted),
    12
  );
  stats.found = research.items.length;

  const known: MatchableVenue[] = [...existing];

  for (const item of research.items) {
    const parsed = VenueDraftSchema.safeParse(item);
    if (!parsed.success) { stats.invalid++; continue; }
    const draft = parsed.data;

    if (findVenueMatch(draft.name_en, known) || findVenueMatch(draft.name_ar, known)) { stats.duplicates++; continue; }

    const { data: inserted, error } = await db.from("venues").insert({
      name_en: draft.name_en,
      name_ar: draft.name_ar,
      aliases: draft.aliases,
      description_en: draft.description_en,
      description_ar: draft.description_ar,
      venue_type: draft.venue_type,
      city: city.name,
      country: city.country,
      address: draft.address ?? null,
      lat: draft.lat ?? null,
      lng: draft.lng ?? null,
      capacity_min: draft.capacity_min ?? null,
      capacity_max: draft.capacity_max ?? null,
      amenities: draft.amenities,
      cover_image: draft.image_url ?? null,
      website_url: draft.website_url ?? null,
      instagram_url: draft.instagram_url ?? null,
      google_maps_url: draft.google_maps_url ?? null,
      phone: draft.phone ?? null,
      whatsapp: draft.whatsapp ?? null,
      email: draft.email ?? null,
      price_range: draft.price_range ?? null,
      is_published: true,
      created_by: creatorId,
      source_url: draft.source_url,
      agent_generated: true,
    }).select("id, name_en, name_ar, aliases").single();

    if (error || !inserted) {
      // 23505 = unique violation on (lower(name_en), lower(city)) — a dup our
      // fuzzy pass missed; count it as such rather than as a failure.
      if (error?.code === "23505") stats.duplicates++;
      else { console.error(`[content-agent] venue insert failed (${city.name}):`, draft.name_en, error?.message); stats.invalid++; }
      continue;
    }

    stats.published++;
    known.push(inserted as MatchableVenue);
  }

  stats.eventsLinked = await linkEventsToVenues(db, city, known);
  return stats;
}

/** Backfill events.venue_id for events in this city whose venue_name now matches a venue. */
async function linkEventsToVenues(db: Admin, city: SweepCity, venues: MatchableVenue[]): Promise<number> {
  if (venues.length === 0) return 0;
  const { data: events } = await db
    .from("events")
    .select("id, venue_name")
    .eq("venue_city", city.name)
    .is("venue_id", null)
    .not("venue_name", "is", null)
    .gte("starts_at", new Date(Date.now() - 30 * DAY_MS).toISOString())
    .limit(300);

  let linked = 0;
  for (const e of events ?? []) {
    const match = findVenueMatch(e.venue_name as string, venues);
    if (!match) continue;
    const { error } = await db.from("events").update({ venue_id: match.id }).eq("id", e.id);
    if (!error) linked++;
  }
  return linked;
}

// ─── Vendors (unchanged policy: inserted unverified) ──────────

async function sweepVendors(db: Admin, cities: SweepCity[], ownerId: string, count: number) {
  const research = await researchAndExtractJson(vendorDiscoveryPrompt(cities, count), 8);
  let created = 0, skipped = 0, invalid = 0;

  for (const item of research.items) {
    const parsed = VendorDraftSchema.safeParse(item);
    if (!parsed.success) { invalid++; continue; }
    const draft = parsed.data;

    const { data: dupes } = await db.from("vendors").select("id")
      .ilike("name_en", draft.name_en).eq("city", draft.city).limit(1);
    if (dupes && dupes.length > 0) { skipped++; continue; }

    const { error } = await db.from("vendors").insert({
      owner_id: ownerId,
      name_en: draft.name_en, name_ar: draft.name_ar,
      description_en: draft.description_en, description_ar: draft.description_ar,
      category: draft.category, city: draft.city, country: draft.country,
      website_url: draft.website_url ?? null, instagram_url: draft.instagram_url ?? null,
      whatsapp: draft.whatsapp ?? null,
      is_verified: false, // vendors are onboarded, not scraped — stays a human decision
      source_url: draft.source_url, agent_generated: true,
    });
    if (error) skipped++; else created++;
  }
  return { found: research.items.length, created, skipped, invalid };
}

// ─── Housekeeping ─────────────────────────────────────────────

async function completePastEvents(db: Admin): Promise<number> {
  const { data, error } = await db
    .from("events")
    .update({ status: "completed" })
    .eq("agent_generated", true)
    .eq("status", "published")
    .lt("ends_at", new Date().toISOString())
    .select("id");
  if (error) { console.error("[content-agent] housekeeping failed:", error.message); return 0; }
  return data?.length ?? 0;
}

// ─── Venue rotation cursor ────────────────────────────────────

async function nextVenueCity(db: Admin, cities: SweepCity[], scopeKey: string): Promise<SweepCity> {
  const key = `content_agent_venue_cursor_${scopeKey}`;
  const { data } = await db.from("agent_config").select("value").eq("key", key).maybeSingle();
  const idx = data?.value ? Number.parseInt(data.value, 10) % cities.length : 0;
  const city = cities[Number.isNaN(idx) ? 0 : idx];
  await db.from("agent_config").upsert({ key, value: String((idx + 1) % cities.length), updated_at: new Date().toISOString() });
  return city;
}

// ─── Orchestration ────────────────────────────────────────────

export type SweepScope = "ksa" | "gcc";

export interface ContentAgentOptions {
  scope?: SweepScope;           // "ksa" = KSA cities only; "gcc" = KSA + GCC
  cities?: string[];            // restrict to these city names (manual/testing)
  eventsPerCity?: number;
  venuesPerCity?: number;
  vendorCount?: number;
  skipVenues?: boolean;
  skipVendors?: boolean;
  /** Absolute ms timestamp after which no NEW city job is started. */
  deadlineMs?: number;
}

export interface ContentAgentResult {
  scope: SweepScope;
  events: CityEventStats[];
  venues: CityVenueStats[];
  vendors: { found: number; created: number; skipped: number; invalid: number } | null;
  completedPastEvents: number;
  skippedCities: string[];      // didn't start before the deadline — next run picks them up
  errors: string[];
  totals: { eventsPublished: number; venuesPublished: number; eventsLinked: number; vendorsCreated: number };
}

export async function runContentAgent(opts: ContentAgentOptions = {}): Promise<ContentAgentResult> {
  const scope: SweepScope = opts.scope ?? "ksa";
  const eventsPerCity = opts.eventsPerCity ?? 8;
  const venuesPerCity = opts.venuesPerCity ?? 8;
  const vendorCount = opts.vendorCount ?? 5;
  const deadlineMs = opts.deadlineMs ?? Date.now() + 220_000;

  const db = createAdminClient();
  const systemProfileId = await getOrCreateContentAgentProfileId();

  let cities: SweepCity[] = scope === "gcc" ? [...KSA_CITIES, ...GCC_CITIES] : [...KSA_CITIES];
  if (opts.cities?.length) {
    const wanted = new Set(opts.cities.map((c) => c.toLowerCase()));
    cities = [...KSA_CITIES, ...GCC_CITIES].filter((c) => wanted.has(c.name.toLowerCase()));
  }

  const errors: string[] = [];
  const result: ContentAgentResult = {
    scope, events: [], venues: [], vendors: null, completedPastEvents: 0, skippedCities: [], errors,
    totals: { eventsPublished: 0, venuesPublished: 0, eventsLinked: 0, vendorsCreated: 0 },
  };

  // Housekeeping first: cheap, and it keeps the "known titles" lists clean.
  result.completedPastEvents = await completePastEvents(db);

  // Pick venue cities for this run: one KSA city always; plus one GCC city
  // on GCC-scope runs. Manual city filters sweep venues for every listed city.
  let venueCities: SweepCity[] = [];
  if (!opts.skipVenues) {
    if (opts.cities?.length) venueCities = cities;
    else {
      venueCities = [await nextVenueCity(db, KSA_CITIES, "ksa")];
      if (scope === "gcc") venueCities.push(await nextVenueCity(db, GCC_CITIES, "gcc"));
    }
  }

  // Venue sweeps go first in the queue so the event sweeps that follow can
  // link against freshly discovered venues in the same run.
  const jobs: { key: string; run: () => Promise<unknown> }[] = [
    ...venueCities.map((city) => ({
      key: `venues:${city.name}`,
      run: async () => { result.venues.push(await sweepCityVenues(db, city, systemProfileId, venuesPerCity)); },
    })),
    ...cities.map((city) => ({
      key: `events:${city.name}`,
      run: async () => { result.events.push(await sweepCityEvents(db, city, systemProfileId, eventsPerCity)); },
    })),
  ];
  if (!opts.skipVendors) {
    jobs.push({ key: "vendors", run: async () => { result.vendors = await sweepVendors(db, cities, systemProfileId, vendorCount); } });
  }

  const { results, skipped } = await runWithBudget(jobs, { concurrency: 4, deadlineMs });
  result.skippedCities = skipped;

  for (const [key, settled] of results) {
    if (settled.status === "rejected") {
      const msg = settled.reason instanceof Error ? settled.reason.message : String(settled.reason);
      errors.push(`${key}: ${msg}`);
      console.error(`[content-agent] ${key} failed:`, msg);
    }
  }

  result.totals.eventsPublished = result.events.reduce((n, s) => n + s.published, 0);
  result.totals.venuesPublished = result.venues.reduce((n, s) => n + s.published, 0);
  result.totals.eventsLinked =
    result.events.reduce((n, s) => n + s.linkedToVenue, 0) + result.venues.reduce((n, s) => n + s.eventsLinked, 0);
  result.totals.vendorsCreated = result.vendors?.created ?? 0;

  return result;
}

export function summarizeRun(r: ContentAgentResult): string {
  const ev = r.events.map((s) => `${s.city} +${s.published}${s.duplicates ? ` (${s.duplicates} dup)` : ""}`).join(", ");
  const ve = r.venues.map((s) => `${s.city} +${s.published}${s.eventsLinked ? ` (${s.eventsLinked} events linked)` : ""}`).join(", ");
  const parts = [
    `[${r.scope}] Published ${r.totals.eventsPublished} event(s)${ev ? `: ${ev}` : ""}.`,
    `Venues +${r.totals.venuesPublished}${ve ? `: ${ve}` : ""}.`,
    r.vendors ? `Vendors +${r.vendors.created} (unverified).` : "",
    r.completedPastEvents ? `Marked ${r.completedPastEvents} past event(s) completed.` : "",
    r.skippedCities.length ? `Skipped (time budget): ${r.skippedCities.join(", ")}.` : "",
    r.errors.length ? `Errors: ${r.errors.length}.` : "",
  ];
  return parts.filter(Boolean).join(" ");
}
