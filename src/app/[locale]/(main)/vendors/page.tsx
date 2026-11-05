import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { buildIlikeOrFilter } from "@/lib/supabase/search";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { Search } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import VendorCard from "@/components/vendors/VendorCard";
import { VENDOR_CATEGORIES, VENDOR_CATEGORY_LABEL } from "@/lib/constants";
import { buildMetadata } from "@/lib/seo";
import type { Vendor } from "@/types";

interface PageProps {
  searchParams: Promise<{ category?: string; city?: string; q?: string }>;
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const { category, city } = await searchParams;
  const locale = await getLocale();
  const isRTL = locale === "ar";
  const categoryLabel = category ? VENDOR_CATEGORY_LABEL[category]?.[isRTL ? "ar" : "en"] : null;

  const title = [categoryLabel, city, isRTL ? "موردو الحفلات" : "Party Vendors"]
    .filter(Boolean)
    .join(isRTL ? " في " : " in ");

  return buildMetadata({
    path: "/vendors",
    locale,
    title: `${title} | Sanatix`,
    description: isRTL
      ? "تصفح مرفهي الأطفال، صانعي الكيك، شركات التصوير والديكور والتموين الموثوقين في الخليج، وتواصل معهم مباشرة."
      : "Browse verified kids' entertainers, cake makers, photographers, decorators, and caterers across the GCC, and contact them directly.",
  });
}

export default async function VendorsPage({ searchParams }: PageProps) {
  const { category, city, q } = await searchParams;
  const locale = await getLocale();
  const t = await getTranslations();
  const isRTL = locale === "ar";
  const supabase = await createClient();

  // Select "*" rather than naming every column explicitly: logo/is_verified
  // aren't exercised anywhere else in the codebase, so their existence on
  // the live schema isn't confirmed (there's no tracked migration file for
  // this table) — a wildcard select degrades gracefully to `undefined`
  // instead of erroring the whole query if a column turns out missing.
  let query = supabase
    .from("vendors")
    .select("*")
    // Same fix as /api/vendors/route.ts: vendors have no status column, so
    // this is the actual enforcement point of "agents never publish" for
    // this table — without it, unreviewed agent-drafted vendors (is_verified
    // defaults false) were publicly visible the instant they were inserted.
    // See 06-Known-Issues-and-Roadmap.md and 07-Autonomous-Agents.md.
    .eq("is_verified", true)
    .order("is_featured", { ascending: false })
    .order("rating", { ascending: false });

  if (city)     query = query.eq("city", city);
  if (category) query = query.eq("category", category);
  if (q)        query = query.or(buildIlikeOrFilter(q, ["name_ar", "name_en"]));

  const { data } = await query;
  const vendors = (data ?? []) as Vendor[];

  // Cities to offer as filters: only ones that actually have verified vendors.
  const { data: cityRows } = await supabase.from("vendors").select("city").eq("is_verified", true);
  const cities = Array.from(new Set((cityRows ?? []).map((r) => r.city as string))).sort();

  function buildHref(overrides: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    const next = { category, city, q, ...overrides };
    if (next.category) params.set("category", next.category);
    if (next.city) params.set("city", next.city);
    if (next.q) params.set("q", next.q);
    const qs = params.toString();
    return qs ? `/vendors?${qs}` : "/vendors";
  }

  return (
    <div className="min-h-screen bg-brand-warm-white">
      <Navbar />

      <div className="max-w-6xl mx-auto px-6 py-10">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-medium text-brand-midnight mb-2">{t("vendors.title")}</h1>
          <p className="text-brand-ink/55 text-sm">{t("vendors.subtitle")}</p>
        </div>

        {/* Search */}
        <form action="/vendors" method="GET" className="relative max-w-xl mb-6">
          {category && <input type="hidden" name="category" value={category} />}
          {city && <input type="hidden" name="city" value={city} />}
          <Search className="absolute start-4 top-1/2 -translate-y-1/2 text-brand-ink/35 w-4 h-4" />
          <input
            type="text"
            name="q"
            defaultValue={q ?? ""}
            placeholder={t("vendors.searchPlaceholder")}
            className="w-full ps-11 pe-4 py-3 rounded-xl border border-black/10 bg-white text-sm text-brand-midnight placeholder:text-brand-ink/35 focus:outline-none focus:ring-2 focus:ring-brand-gold/30"
          />
        </form>

        {/* City chips */}
        {cities.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
            <Link
              href={buildHref({ city: undefined })}
              className={`shrink-0 px-4 py-2 rounded-full text-sm border transition-colors ${
                !city ? "bg-brand-midnight text-white border-brand-midnight" : "bg-white text-brand-ink/65 border-black/10 hover:border-brand-gold/50"
              }`}
            >
              {t("venues.allCities")}
            </Link>
            {cities.map((c) => (
              <Link
                key={c}
                href={buildHref({ city: c })}
                className={`shrink-0 px-4 py-2 rounded-full text-sm border transition-colors ${
                  city === c ? "bg-brand-midnight text-white border-brand-midnight" : "bg-white text-brand-ink/65 border-black/10 hover:border-brand-gold/50"
                }`}
              >
                {c}
              </Link>
            ))}
          </div>
        )}

        {/* Category chips */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-8">
          <Link
            href={buildHref({ category: undefined })}
            className={`shrink-0 px-4 py-2 rounded-full text-sm border transition-colors ${
              !category ? "bg-brand-midnight text-white border-brand-midnight" : "bg-white text-brand-ink/65 border-black/10 hover:border-brand-gold/50"
            }`}
          >
            {t("vendors.allServices")}
          </Link>
          {VENDOR_CATEGORIES.map((cat) => (
            <Link
              key={cat}
              href={buildHref({ category: cat })}
              className={`shrink-0 px-4 py-2 rounded-full text-sm border transition-colors capitalize ${
                category === cat ? "bg-brand-midnight text-white border-brand-midnight" : "bg-white text-brand-ink/65 border-black/10 hover:border-brand-gold/50"
              }`}
            >
              {isRTL ? VENDOR_CATEGORY_LABEL[cat].ar : VENDOR_CATEGORY_LABEL[cat].en}
            </Link>
          ))}
        </div>

        {/* Results */}
        {vendors.length === 0 ? (
          <div className="bg-white rounded-2xl border border-black/5 p-16 text-center">
            <p className="text-brand-ink/60 text-sm mb-1">{t("vendors.empty")}</p>
            <p className="text-brand-ink/40 text-xs">{t("vendors.emptyHint")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {vendors.map((vendor) => (
              <VendorCard key={vendor.id} vendor={vendor} locale={locale} t={t} />
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
