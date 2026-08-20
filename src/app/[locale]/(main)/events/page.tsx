import { createClient } from "@/lib/supabase/server";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { Search, CalendarDays, MapPin } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import { formatCurrency, formatDate } from "@/lib/utils";
import { EVENT_CATEGORIES, EVENT_CATEGORY_LABEL } from "@/lib/constants";

interface PageProps {
  searchParams: Promise<{ category?: string; city?: string; q?: string; page?: string }>;
}

const PAGE_SIZE = 12;

export default async function EventsPage({ searchParams }: PageProps) {
  const { category, city, q, page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1") || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const locale = await getLocale();
  const t = await getTranslations();
  const isRTL = locale === "ar";
  const supabase = await createClient();

  let query = supabase
    .from("events")
    .select("id, title_ar, title_en, cover_image, starts_at, venue_city, category, is_featured, ticket_types(price, currency)", { count: "exact" })
    .eq("status", "published")
    .order("starts_at", { ascending: true })
    .range(offset, offset + PAGE_SIZE - 1);

  if (city)     query = query.eq("venue_city", city);
  if (category) query = query.eq("category", category);
  if (q)        query = query.or(`title_ar.ilike.%${q}%,title_en.ilike.%${q}%`);

  const [{ data: events, count }, { data: cityRows }] = await Promise.all([
    query,
    supabase.from("events").select("venue_city").eq("status", "published"),
  ]);

  const cities = Array.from(new Set((cityRows ?? []).map((r) => r.venue_city).filter(Boolean))).sort();
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  function buildHref(overrides: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    const next = { category, city, q, ...overrides };
    if (next.category) params.set("category", next.category);
    if (next.city) params.set("city", next.city);
    if (next.q) params.set("q", next.q);
    const qs = params.toString();
    return qs ? `/events?${qs}` : "/events";
  }

  return (
    <div className="min-h-screen bg-brand-warm-white">
      <Navbar />

      <div className="max-w-6xl mx-auto px-6 py-10">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-medium text-brand-midnight mb-2">{t("events.title")}</h1>
          <p className="text-brand-ink/55 text-sm">
            {isRTL ? "اكتشف الفعاليات في جميع أنحاء الخليج" : "Discover events happening across the GCC"}
          </p>
        </div>

        {/* Search */}
        <form action="/events" method="GET" className="flex gap-3 mb-6">
          {category && <input type="hidden" name="category" value={category} />}
          {city && <input type="hidden" name="city" value={city} />}
          <div className="relative flex-1">
            <Search className="absolute start-4 top-1/2 -translate-y-1/2 text-brand-ink/35 w-4 h-4" />
            <input
              type="text"
              name="q"
              defaultValue={q ?? ""}
              placeholder={t("home.searchPlaceholder")}
              className="w-full ps-11 pe-4 py-3 rounded-xl border border-black/10 bg-white text-sm text-brand-midnight placeholder:text-brand-ink/35 focus:outline-none focus:ring-2 focus:ring-brand-gold/30"
            />
          </div>
          <button type="submit" className="px-5 py-3 rounded-xl bg-brand-midnight text-white text-sm font-medium hover:bg-brand-ink transition-colors">
            {t("common.search")}
          </button>
        </form>

        {/* Category chips */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide">
          <Link
            href={buildHref({ category: undefined })}
            className={`shrink-0 px-4 py-2 rounded-full text-sm border transition-colors ${
              !category ? "bg-brand-midnight text-white border-brand-midnight" : "bg-white text-brand-ink/65 border-black/10 hover:border-brand-gold/50"
            }`}
          >
            {isRTL ? "الكل" : "All Events"}
          </Link>
          {EVENT_CATEGORIES.map((cat) => (
            <Link
              key={cat}
              href={buildHref({ category: cat })}
              className={`shrink-0 px-4 py-2 rounded-full text-sm border transition-colors capitalize ${
                category === cat ? "bg-brand-midnight text-white border-brand-midnight" : "bg-white text-brand-ink/65 border-black/10 hover:border-brand-gold/50"
              }`}
            >
              {isRTL ? EVENT_CATEGORY_LABEL[cat].ar : EVENT_CATEGORY_LABEL[cat].en}
            </Link>
          ))}
        </div>

        {/* City tabs */}
        {cities.length > 0 && (
          <div className="flex gap-6 border-b border-black/8 mb-8 text-sm overflow-x-auto">
            <Link
              href={buildHref({ city: undefined })}
              className={`pb-3 border-b-2 transition-colors shrink-0 ${
                !city ? "border-brand-gold text-brand-midnight font-medium -mb-px" : "border-transparent text-brand-ink/50 hover:text-brand-midnight"
              }`}
            >
              {isRTL ? "كل المدن" : "All Cities"}
            </Link>
            {cities.map((c) => (
              <Link
                key={c}
                href={buildHref({ city: c })}
                className={`pb-3 border-b-2 transition-colors shrink-0 ${
                  city === c ? "border-brand-gold text-brand-midnight font-medium -mb-px" : "border-transparent text-brand-ink/50 hover:text-brand-midnight"
                }`}
              >
                {c}
              </Link>
            ))}
          </div>
        )}

        {/* Results */}
        {!events || events.length === 0 ? (
          <div className="bg-white rounded-2xl border border-black/5 p-16 text-center">
            <p className="text-brand-ink/60 text-sm">
              {isRTL ? "لا توجد فعاليات مطابقة" : "No events match these filters"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {events.map((event) => {
              const title = isRTL ? event.title_ar : event.title_en;
              const prices = (event.ticket_types ?? []).map((tt) => tt.price);
              const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
              const currency = event.ticket_types?.[0]?.currency ?? "SAR";
              return (
                <Link
                  key={event.id}
                  href={`/events/${event.id}`}
                  className="bg-white rounded-2xl border border-black/5 overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div className="h-44 bg-brand-sand relative overflow-hidden">
                    {event.cover_image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={event.cover_image} alt={title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg width="40" height="40" viewBox="0 0 34 34" fill="none" opacity="0.15">
                          <circle cx="6" cy="28" r="3" fill="#C8973A" />
                          <circle cx="16" cy="18" r="4.5" fill="#C8973A" />
                          <circle cx="28" cy="6" r="6" fill="#C8973A" />
                        </svg>
                      </div>
                    )}
                    {event.is_featured && (
                      <span className="absolute top-3 start-3 text-xs bg-brand-gold text-white px-2.5 py-1 rounded-full font-medium">
                        {t("events.featured")}
                      </span>
                    )}
                  </div>
                  <div className="p-4">
                    <p className="font-medium text-brand-midnight text-sm mb-1.5 truncate">{title}</p>
                    <div className="flex items-center gap-1.5 text-xs text-brand-ink/50 mb-1">
                      <CalendarDays size={12} />
                      {formatDate(event.starts_at, isRTL ? "ar-SA" : "en-US")}
                    </div>
                    {event.venue_city && (
                      <div className="flex items-center gap-1.5 text-xs text-brand-ink/50 mb-2">
                        <MapPin size={12} />
                        {event.venue_city}
                      </div>
                    )}
                    <p className="text-sm font-medium text-brand-gold">
                      {minPrice === 0 ? t("events.free") : formatCurrency(minPrice, currency, isRTL ? "ar-SA" : "en-US")}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-10">
            {Array.from({ length: totalPages }).map((_, i) => {
              const p = i + 1;
              const params = new URLSearchParams();
              if (category) params.set("category", category);
              if (city) params.set("city", city);
              if (q) params.set("q", q);
              if (p > 1) params.set("page", String(p));
              const qs = params.toString();
              return (
                <Link
                  key={p}
                  href={qs ? `/events?${qs}` : "/events"}
                  className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                    p === page ? "bg-brand-midnight text-white" : "bg-white border border-black/10 text-brand-ink/60 hover:bg-brand-sand"
                  }`}
                >
                  {p}
                </Link>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}
