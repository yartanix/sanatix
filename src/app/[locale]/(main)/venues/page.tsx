import { createClient } from "@/lib/supabase/server";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { Search } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import VenueCard from "@/components/venues/VenueCard";
import { VENUE_TYPES, VENUE_TYPE_LABEL, ALL_SWEEP_CITIES } from "@/lib/constants";
import type { Venue } from "@/types";

interface PageProps {
  searchParams: Promise<{ type?: string; city?: string; q?: string }>;
}

export default async function VenuesPage({ searchParams }: PageProps) {
  const { type, city, q } = await searchParams;
  const locale = await getLocale();
  const t = await getTranslations();
  const isRTL = locale === "ar";
  const supabase = await createClient();

  let query = supabase
    .from("venues")
    .select("*")
    .eq("is_published", true)
    .order("is_featured", { ascending: false })
    .order("rating", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(60);

  if (city) query = query.eq("city", city);
  if (type) query = query.eq("venue_type", type);
  if (q)    query = query.or(`name_ar.ilike.%${q}%,name_en.ilike.%${q}%`);

  const { data } = await query;
  const venues = (data ?? []) as Venue[];

  // Cities to offer as filters: the ones that actually have venues, in
  // sweep order so Saudi cities come first.
  const { data: cityRows } = await supabase.from("venues").select("city").eq("is_published", true);
  const present = new Set((cityRows ?? []).map((r) => r.city as string));
  const cities = ALL_SWEEP_CITIES.filter((c) => present.has(c.name));

  function buildHref(overrides: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    const next = { type, city, q, ...overrides };
    if (next.type) params.set("type", next.type);
    if (next.city) params.set("city", next.city);
    if (next.q) params.set("q", next.q);
    const qs = params.toString();
    return qs ? `/venues?${qs}` : "/venues";
  }

  const chip = (active: boolean) =>
    `shrink-0 px-4 py-2 rounded-full text-sm border transition-colors ${
      active ? "bg-brand-midnight text-white border-brand-midnight" : "bg-white text-brand-ink/65 border-black/10 hover:border-brand-gold/50"
    }`;

  return (
    <div className="min-h-screen bg-brand-warm-white">
      <Navbar />

      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-medium text-brand-midnight mb-2">{t("venues.title")}</h1>
          <p className="text-brand-ink/55 text-sm">{t("venues.subtitle")}</p>
        </div>

        <form action="/venues" method="GET" className="relative max-w-xl mb-6">
          {type && <input type="hidden" name="type" value={type} />}
          {city && <input type="hidden" name="city" value={city} />}
          <Search className="absolute start-4 top-1/2 -translate-y-1/2 text-brand-ink/35 w-4 h-4" />
          <input
            type="text"
            name="q"
            defaultValue={q ?? ""}
            placeholder={t("venues.searchPlaceholder")}
            className="w-full ps-11 pe-4 py-3 rounded-xl border border-black/10 bg-white text-sm text-brand-midnight placeholder:text-brand-ink/35 focus:outline-none focus:ring-2 focus:ring-brand-gold/30"
          />
        </form>

        {cities.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
            <Link href={buildHref({ city: undefined })} className={chip(!city)}>{t("venues.allCities")}</Link>
            {cities.map((c) => (
              <Link key={c.name} href={buildHref({ city: c.name })} className={chip(city === c.name)}>
                {isRTL ? c.name_ar : c.name}
              </Link>
            ))}
          </div>
        )}

        <div className="flex gap-2 overflow-x-auto pb-2 mb-8">
          <Link href={buildHref({ type: undefined })} className={chip(!type)}>{t("venues.allTypes")}</Link>
          {VENUE_TYPES.filter((v) => v !== "other").map((v) => (
            <Link key={v} href={buildHref({ type: v })} className={chip(type === v)}>
              {VENUE_TYPE_LABEL[v][isRTL ? "ar" : "en"]}
            </Link>
          ))}
        </div>

        {venues.length === 0 ? (
          <div className="bg-white rounded-2xl border border-black/5 p-16 text-center">
            <p className="text-brand-ink/60 text-sm mb-1">{t("venues.empty")}</p>
            <p className="text-brand-ink/40 text-xs">{t("venues.emptyHint")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {venues.map((venue) => (
              <VenueCard key={venue.id} venue={venue} locale={locale} t={t} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
