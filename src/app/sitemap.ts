import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";
import { SITE_URL } from "@/lib/constants";

// Plain anon client (no cookies/session needed) — a sitemap only ever
// lists publicly-readable rows, and avoiding next/headers here keeps
// this route safely static-cacheable rather than tied to a request.
function publicClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// Both locales for a given locale-free path. Arabic (default locale) has
// no prefix, English is served under /en — see src/i18n/routing.ts.
function localeUrls(path: string) {
  return [`${SITE_URL}${path}`, `${SITE_URL}/en${path}`];
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = publicClient();

  const [{ data: events }, { data: venues }, { data: vendors }, { data: campaigns }] =
    await Promise.all([
      supabase
        .from("events")
        .select("id, organizer_id, created_at")
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(5000),
      supabase
        .from("venues")
        .select("id, created_at")
        .eq("is_published", true)
        .order("created_at", { ascending: false })
        .limit(5000),
      supabase
        .from("vendors")
        .select("id, created_at")
        .eq("is_verified", true)
        .order("created_at", { ascending: false })
        .limit(5000),
      supabase
        .from("campaigns")
        .select("id, created_at")
        .eq("status", "active")
        .limit(2000),
    ]);

  // An "organizer" has no flag of its own — same derivation the /organizers
  // listing page uses: anyone with at least one published event.
  const organizerIds = Array.from(new Set((events ?? []).map((e) => e.organizer_id))).filter(Boolean);

  const staticPaths = ["/", "/events", "/venues", "/vendors", "/organizers", "/crowdfunding", "/plan-a-party"];

  const entries: MetadataRoute.Sitemap = staticPaths.flatMap((path) =>
    localeUrls(path).map((url) => ({
      url,
      changeFrequency: path === "/" ? "daily" : "hourly",
      priority: path === "/" ? 1 : 0.8,
    }))
  );

  for (const e of events ?? []) {
    for (const url of localeUrls(`/events/${e.id}`)) {
      entries.push({ url, lastModified: e.created_at, changeFrequency: "daily", priority: 0.7 });
    }
  }
  for (const v of venues ?? []) {
    for (const url of localeUrls(`/venues/${v.id}`)) {
      entries.push({ url, lastModified: v.created_at, changeFrequency: "weekly", priority: 0.6 });
    }
  }
  for (const v of vendors ?? []) {
    for (const url of localeUrls(`/vendors/${v.id}`)) {
      entries.push({ url, lastModified: v.created_at, changeFrequency: "weekly", priority: 0.6 });
    }
  }
  for (const organizerId of organizerIds) {
    for (const url of localeUrls(`/organizers/${organizerId}`)) {
      entries.push({ url, changeFrequency: "weekly", priority: 0.4 });
    }
  }
  for (const c of campaigns ?? []) {
    for (const url of localeUrls(`/crowdfunding/${c.id}`)) {
      entries.push({ url, lastModified: c.created_at, changeFrequency: "daily", priority: 0.5 });
    }
  }

  return entries;
}
