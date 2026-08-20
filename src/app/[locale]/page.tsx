import { getLocale, getTranslations } from "next-intl/server";
import { Search, CalendarDays, MapPin } from "lucide-react";
import { Link } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";
import Navbar from "@/components/layout/Navbar";
import { formatCurrency, formatDate } from "@/lib/utils";

export default async function HomePage() {
  const locale = await getLocale();
  const t = await getTranslations();
  const isRTL = locale === "ar";
  const supabase = await createClient();

  const { data: featuredEvents } = await supabase
    .from("events")
    .select("id, title_ar, title_en, venue_city, cover_image, starts_at, is_free, ticket_types(price, currency)")
    .eq("status", "published")
    .order("is_featured", { ascending: false })
    .order("view_count", { ascending: false })
    .limit(3);

  return (
    <main className="min-h-screen bg-brand-warm-white">
      <Navbar />

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-16 text-center">
        <h1 className="text-5xl md:text-6xl font-medium tracking-tight text-brand-midnight mb-4">
          {t("home.hero")}
        </h1>
        <p className="text-lg text-brand-ink/60 mb-10 max-w-xl mx-auto">
          {t("home.heroSub")}
        </p>

        {/* Search bar */}
        <form action="/events" method="GET" className="max-w-2xl mx-auto relative">
          <Search className="absolute start-4 top-1/2 -translate-y-1/2 text-brand-ink/40 w-5 h-5" />
          <input
            type="text"
            name="q"
            placeholder={t("home.searchPlaceholder")}
            className="w-full ps-12 pe-6 py-4 rounded-2xl border border-black/10 bg-white shadow-sm text-brand-midnight placeholder:text-brand-ink/40 focus:outline-none focus:ring-2 focus:ring-brand-gold/30 text-base"
          />
        </form>
      </section>

      {/* Featured Events */}
      <section className="max-w-6xl mx-auto px-6 pb-20">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-medium text-brand-midnight">{t("home.featuredEvents")}</h2>
          <Link href="/events" className="text-sm text-brand-gold hover:underline">{t("common.viewAll")}</Link>
        </div>

        {!featuredEvents || featuredEvents.length === 0 ? (
          <div className="bg-white rounded-2xl border border-black/5 p-12 text-center">
            <p className="text-brand-ink/50 text-sm">
              {isRTL ? "لا توجد فعاليات منشورة بعد" : "No published events yet — check back soon"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {featuredEvents.map((event) => {
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
                  <div className="h-44 bg-brand-sand overflow-hidden">
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
                  </div>
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs bg-brand-gold/10 text-brand-gold px-2.5 py-1 rounded-full font-medium">
                        {t("events.featured")}
                      </span>
                    </div>
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
                      {event.is_free || minPrice === 0 ? t("events.free") : formatCurrency(minPrice, currency, isRTL ? "ar-SA" : "en-US")}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

    </main>
  );
}
