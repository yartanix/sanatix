import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOrCreateContentAgentProfileId } from "@/lib/agents/system-profile";
import { EVENT_CATEGORIES, VENDOR_CATEGORIES } from "@/lib/constants";

const GCC_CITIES = [
  "Riyadh, Saudi Arabia", "Jeddah, Saudi Arabia", "Dammam, Saudi Arabia",
  "Dubai, UAE", "Abu Dhabi, UAE",
  "Manama, Bahrain", "Kuwait City, Kuwait", "Doha, Qatar",
];

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

// ─── Output schemas ────────────────────────────────────────────
// Every field the model is asked for is validated here before anything
// touches the database. An item that fails validation is skipped (and
// counted), never partially inserted — see runContentAgent().

const EventDraftSchema = z.object({
  title_en: z.string().min(3),
  title_ar: z.string().min(2),
  description_en: z.string().min(10),
  description_ar: z.string().min(5),
  venue_name: z.string().nullable().optional(),
  venue_city: z.string().min(2),
  venue_country: z.string().length(2).default("SA"),
  starts_at: z.string().datetime({ offset: true }).or(z.string().min(10)),
  ends_at: z.string().datetime({ offset: true }).or(z.string().min(10)).nullable().optional(),
  category: z.enum(EVENT_CATEGORIES),
  is_free: z.boolean().default(false),
  source_url: z.string().url(),
});

const VendorDraftSchema = z.object({
  name_en: z.string().min(2),
  name_ar: z.string().min(2),
  description_en: z.string().min(10),
  description_ar: z.string().min(5),
  category: z.enum(VENDOR_CATEGORIES),
  city: z.string().min(2),
  country: z.string().length(2).default("SA"),
  website_url: z.string().url().nullable().optional(),
  instagram_url: z.string().url().nullable().optional(),
  whatsapp: z.string().nullable().optional(),
  source_url: z.string().url(),
});

type EventDraft = z.infer<typeof EventDraftSchema>;
type VendorDraft = z.infer<typeof VendorDraftSchema>;

function getClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set.");
  return new Anthropic({ apiKey });
}

/**
 * Runs a web-search-grounded research prompt and extracts a JSON array
 * from the model's final answer. Returns the raw parsed array (not yet
 * schema-validated) plus the number of searches actually used, for
 * logging. Throws only on a hard API failure or completely unparseable
 * output — a partially-bad array is handled by the caller's per-item
 * validation, not here.
 */
async function researchAndExtractJson(prompt: string, maxSearches: number): Promise<unknown[]> {
  const client = getClient();

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    tools: [
      {
        type: "web_search_20250305",
        name: "web_search",
        max_uses: maxSearches,
      },
    ],
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n");

  const fenced = text.match(/```json\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text.slice(text.indexOf("["), text.lastIndexOf("]") + 1);

  if (!candidate || candidate.trim().length === 0) {
    throw new Error(`No JSON array found in model output. Raw text: ${text.slice(0, 500)}`);
  }

  const parsed = JSON.parse(candidate);
  if (!Array.isArray(parsed)) {
    throw new Error("Parsed JSON was not an array.");
  }
  return parsed;
}

function eventDiscoveryPrompt(count: number): string {
  return `You are researching REAL, currently-scheduled public events happening in the next 60 days in these GCC cities: ${GCC_CITIES.join(", ")}.

Use web search to find up to ${count} real events — conferences, weddings expos, exhibitions, sporting events, concerts/entertainment, family events, community events, or corporate events. Only include events you find real evidence for via search results. Do not invent an event, its date, its venue, or its price under any circumstances — if you can't verify something with a search result, leave it out entirely rather than guessing.

For each event you can verify, extract:
- title_en, title_ar (translate to Arabic if only English is available; keep it natural, not literal)
- description_en, description_ar (1-2 honest sentences, no marketing hyperbole)
- venue_name (or null if not stated), venue_city, venue_country (2-letter code, e.g. SA, AE, BH, KW, QA)
- starts_at (ISO 8601 — your best-evidenced date/time; if only a date is known, use a reasonable time like 19:00 local and say so in the description)
- ends_at (ISO 8601, or null)
- category — MUST be exactly one of: ${EVENT_CATEGORIES.join(", ")}
- is_free (boolean)
- source_url — the exact URL where you found this event

Respond with a short summary of your research, then end your response with ONLY a fenced \`\`\`json code block containing a JSON array of objects with exactly these fields. If you find zero verifiable events, output an empty array \`[]\`.`;
}

function vendorDiscoveryPrompt(count: number): string {
  return `You are researching REAL event-services businesses (vendors) currently operating in these GCC cities: ${GCC_CITIES.join(", ")}.

Use web search to find up to ${count} real, currently-operating businesses in categories like: ${VENDOR_CATEGORIES.join(", ")}. Only include businesses you find real evidence for via search results (their own website, Instagram, Google Business listing, or a directory listing them). Do not invent a business or its contact details.

For each business you can verify, extract:
- name_en, name_ar (translate if only one language is available)
- description_en, description_ar (1-2 honest sentences describing what they offer, based only on what you found)
- category — MUST be exactly one of: ${VENDOR_CATEGORIES.join(", ")}
- city, country (2-letter code, e.g. SA, AE, BH, KW, QA)
- website_url, instagram_url, whatsapp (each nullable — only include if you actually found it)
- source_url — the exact URL where you found this business

Respond with a short summary of your research, then end your response with ONLY a fenced \`\`\`json code block containing a JSON array of objects with exactly these fields. If you find zero verifiable businesses, output an empty array \`[]\`.`;
}

async function insertEventDrafts(drafts: EventDraft[], organizerId: string) {
  const supabase = createAdminClient();
  let created = 0;
  let skipped = 0;

  for (const draft of drafts) {
    // Dedup: same title + same city already present (agent- or human-authored).
    const { data: dupes } = await supabase
      .from("events")
      .select("id")
      .eq("title_en", draft.title_en)
      .eq("venue_city", draft.venue_city)
      .limit(1);

    if (dupes && dupes.length > 0) {
      skipped++;
      continue;
    }

    const { error } = await supabase.from("events").insert({
      organizer_id: organizerId,
      title_en: draft.title_en,
      title_ar: draft.title_ar,
      description_en: draft.description_en,
      description_ar: draft.description_ar,
      venue_name: draft.venue_name ?? null,
      venue_city: draft.venue_city,
      venue_country: draft.venue_country,
      starts_at: draft.starts_at,
      ends_at: draft.ends_at ?? draft.starts_at,
      status: "draft", // NEVER 'published' — see CHANGES.md for why this is a hard rule, not a default
      is_free: draft.is_free,
      category: draft.category,
      source_url: draft.source_url,
      agent_generated: true,
    });

    if (error) {
      console.error("[content-agent] failed to insert event draft:", draft.title_en, error);
      skipped++;
    } else {
      created++;
    }
  }

  return { created, skipped };
}

async function insertVendorDrafts(drafts: VendorDraft[], ownerId: string) {
  const supabase = createAdminClient();
  let created = 0;
  let skipped = 0;

  for (const draft of drafts) {
    const { data: dupes } = await supabase
      .from("vendors")
      .select("id")
      .eq("name_en", draft.name_en)
      .eq("city", draft.city)
      .limit(1);

    if (dupes && dupes.length > 0) {
      skipped++;
      continue;
    }

    const { error } = await supabase.from("vendors").insert({
      owner_id: ownerId,
      name_en: draft.name_en,
      name_ar: draft.name_ar,
      description_en: draft.description_en,
      description_ar: draft.description_ar,
      category: draft.category,
      city: draft.city,
      country: draft.country,
      website_url: draft.website_url ?? null,
      instagram_url: draft.instagram_url ?? null,
      whatsapp: draft.whatsapp ?? null,
      is_verified: false, // agent-sourced — never auto-verified, see CHANGES.md
      source_url: draft.source_url,
      agent_generated: true,
    });

    if (error) {
      console.error("[content-agent] failed to insert vendor draft:", draft.name_en, error);
      skipped++;
    } else {
      created++;
    }
  }

  return { created, skipped };
}

export interface ContentAgentResult {
  eventsCreated: number;
  eventsSkipped: number;
  vendorsCreated: number;
  vendorsSkipped: number;
  eventsFoundInvalid: number;
  vendorsFoundInvalid: number;
}

export async function runContentAgent(opts?: { eventCount?: number; vendorCount?: number }): Promise<ContentAgentResult> {
  const eventCount = opts?.eventCount ?? 5;
  const vendorCount = opts?.vendorCount ?? 5;

  const systemProfileId = await getOrCreateContentAgentProfileId();

  const [rawEvents, rawVendors] = await Promise.all([
    researchAndExtractJson(eventDiscoveryPrompt(eventCount), 8),
    researchAndExtractJson(vendorDiscoveryPrompt(vendorCount), 8),
  ]);

  const validEvents: EventDraft[] = [];
  let eventsFoundInvalid = 0;
  for (const item of rawEvents) {
    const parsed = EventDraftSchema.safeParse(item);
    if (parsed.success) validEvents.push(parsed.data);
    else eventsFoundInvalid++;
  }

  const validVendors: VendorDraft[] = [];
  let vendorsFoundInvalid = 0;
  for (const item of rawVendors) {
    const parsed = VendorDraftSchema.safeParse(item);
    if (parsed.success) validVendors.push(parsed.data);
    else vendorsFoundInvalid++;
  }

  const eventResult = await insertEventDrafts(validEvents, systemProfileId);
  const vendorResult = await insertVendorDrafts(validVendors, systemProfileId);

  return {
    eventsCreated: eventResult.created,
    eventsSkipped: eventResult.skipped,
    vendorsCreated: vendorResult.created,
    vendorsSkipped: vendorResult.skipped,
    eventsFoundInvalid,
    vendorsFoundInvalid,
  };
}
