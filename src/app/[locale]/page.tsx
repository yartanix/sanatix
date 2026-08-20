import { getLocale, getTranslations } from "next-intl/server";
import { Search, CalendarDays, MapPin, Sparkles, ArrowRight } from "lucide-react";
import { Link } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";
import Navbar from "@/components/layout/Navbar";
import { formatCurrency, formatDate } from "@/lib/utils";
import { EVENT_CATEGORIES, EVENT_CATEGORY_LABEL } from "@/lib/constants";

const QUICK_CATEGORIES = EVENT_CATEGORIES.slice(0, 4);

export default async function HomePage() {
  const locale = await getLocale();
  const t = await getTranslations();
  const isRTL = locale === "ar";
  const supabase = await createClient();

  const { data: featuredEvents } = await supabase
    .from("events")
    .select("id, title_ar, title_en, venue_city, cover_image, starts_at, is_free, is_featured, ticket_types(price, currency)")
    .eq("status", "published")
    .order("is_featured", { ascending: false })
    .order("view_count", { ascending: false })
    .limit(3);

  return (
    <main className="min-h-screen bg-brand-warm-white">
      <Navbar />

      {/* Hero — dark, gradient-lit */}
      <section
        className="relative overflow-hidden text-center px-6 pt-24 pb-28"
        style={{
          background:
            "radial-gradient(1100px 620px at 82% -10%, rgba(200,151,58,0.30), transparent 60%)," +
            "radial-gradient(900px 520px at -6% 12%, rgba(232,196,122,0.16), transparent 55%)," +
            "linear-gradient(180deg, #0F0F14 0%, #0F0F14 70%, #17151C 100%)",
        }}
      >
        {/* faint dot texture for depth */}
        <div
          className="absolute inset-0 opacity-50 pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(rgba(245,244,240,0.06) 1px, transparent 1px)",
            backgroundSize: "26px 26px",
            maskImage: "radial-gradient(1200px 700px at 60% 0%, black, transparent 75%)",
            WebkitMaskImage: "radial-gradient(1200px 700px at 60% 0%, black, transparent 75%)",
          }}
        />

        <div className="relative">
          <span className="inline-flex items-center gap-2 text-xs font-semibold tracking-wide text-brand-gold-light bg-brand-gold/10 border border-brand-gold/30 rounded-full px-4 py-2 mb-7">
            <Sparkles size={13} />
            {isRTL ? "اكتشاف الفعاليات بذكاء" : "AI-powered event discovery"}
          </span>

          <h1 className="max-w-3xl mx-auto text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.05] text-brand-warm-white">
            {t("home.hero")}
          </h1>
          <p className="max-w-xl mx-auto mt-6 text-lg text-brand-warm-white/60 leading-relaxed">
            {t("home.heroSub")}
          </p>

          {/* Search */}
          <form action="/events" method="GET" className="relative max-w-xl mx-auto mt-11">
            <div className="absolute -inset-3.5 rounded-full bg-gradient-to-br from-brand-gold-light/35 to-brand-gold/15 blur-2xl opacity-80 -z-10" />
            <div className="flex items-center gap-3 rounded-full border border-white/[0.18] bg-white/[0.08] backdrop-blur-xl py-2 ps-6 pe-2">
              <Search size={18} className="text-brand-gold-light shrink-0" />
              <input
                type="text"
                name="q"
                placeholder={t("home.searchPlaceholder")}
                className="flex-1 bg-transparent text-sm text-brand-warm-white placeholder:text-brand-warm-white/40 focus:outline-none py-2.5"
              />
              <button
                type="submit"
                className="shrink-0 flex items-center gap-1.5 text-sm font-semibold text-brand-midnight rounded-full px-5 py-2.5 bg-gradient-to-br from-brand-gold-light to-brand-gold hover:opacity-90 transition-opacity"
              >
                {t("common.search")}
              </button>
            </div>
          </form>

          {/* Quick category chips */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 mt-6">
            {QUICK_CATEGORIES.map((cat) => (
              <Link
                key={cat}
                href={`/events?category=${cat}`}
                className="text-sm font-medium text-brand-warm-white/70 hover:text-brand-warm-white border border-white/15 hover:border-white/30 rounded-full px-4 py-2 transition-colors"
              >
                {isRTL ? EVENT_CATEGORY_LABEL[cat].ar : EVENT_CATEGORY_LABEL[cat].en}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Events */}
      <section
        className="relative px-6 pt-16 pb-24"
        style={{ background: "radial-gradient(900px 420px at 50% -10%, rgba(200,151,58,0.08), transparent 60%)" }}
      >
        <div className="max-w-6xl mx-auto">
          <div className="flex items-end justify-between mb-7">
            <div>
              <p className="text-xs font-semibold tracking-wide text-[#8A5E12] uppercase mb-1.5">
                {isRTL ? "مختارة لك" : "Curated for you"}
              </p>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-brand-midnight">{t("home.featuredEvents")}</h2>
            </div>
            <Link href="/events" className="flex items-center gap-1.5 text-sm font-semibold text-[#8A5E12] hover:text-brand-gold shrink-0">
              {t("common.viewAll")}
              <ArrowRight size={14} className={isRTL ? "rotate-180" : ""} />
            </Link>
          </div>

          {!featuredEvents || featuredEvents.length === 0 ? (
            <div className="bg-white rounded-3xl border border-black/5 p-12 text-center">
              <p className="text-brand-ink/50 text-sm">
                {isRTL ? "لا توجد فعاليات منشورة بعد" : "No published events yet — check back soon"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredEvents.map((event) => {
                const title = isRTL ? event.title_ar : event.title_en;
                const prices = (event.ticket_types ?? []).map((tt) => tt.price);
                const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
                const currency = event.ticket_types?.[0]?.currency ?? "SAR";
                return (
                  <Link
                    key={event.id}
                    href={`/events/${event.id}`}
                    className="group rounded-[28px] overflow-hidden bg-white/70 backdrop-blur-xl border border-white shadow-[0_18px_40px_-18px_rgba(15,15,20,0.22)] hover:shadow-[0_24px_48px_-16px_rgba(15,15,20,0.28)] transition-shadow"
                  >
                    <div className="relative h-44 bg-gradient-to-br from-brand-gold/15 to-brand-ink/5 flex items-center justify-center">
                      {event.cover_image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={event.cover_image} alt={title} className="w-full h-full object-cover" />
                      ) : (
                        <svg width="38" height="38" viewBox="0 0 34 34" fill="none" opacity="0.18">
                          <circle cx="6" cy="28" r="3" fill="#0F0F14" />
                          <circle cx="16" cy="18" r="4.5" fill="#0F0F14" />
                          <circle cx="28" cy="6" r="6" fill="#0F0F14" />
                        </svg>
                      )}
                      {event.is_featured && (
                        <span className="absolute top-3.5 start-3.5 text-[11px] font-bold text-[#8A5E12] bg-[#FBF0DB] rounded-full px-3 py-1.5">
                          {t("events.featured")}
                        </span>
                      )}
                      <span className="absolute top-3.5 end-3.5 text-xs font-bold text-brand-warm-white bg-brand-midnight/70 backdrop-blur rounded-full px-3 py-1.5">
                        {event.is_free || minPrice === 0 ? t("events.free") : formatCurrency(minPrice, currency, isRTL ? "ar-SA" : "en-US")}
                      </span>
                    </div>
                    <div className="p-5 space-y-2.5">
                      <p className="font-bold text-brand-midnight text-[15px] tracking-tight leading-snug">{title}</p>
                      <div className="flex items-center gap-1.5 text-[13px] text-brand-ink/55">
                        <CalendarDays size={13} />
                        {formatDate(event.starts_at, isRTL ? "ar-SA" : "en-US")}
                      </div>
                      {event.venue_city && (
                        <div className="flex items-center justify-between pt-2.5 mt-1 border-t border-black/[0.06]">
                          <span className="flex items-center gap-1.5 text-xs font-semibold text-brand-ink/60">
                            <MapPin size={12} />
                            {event.venue_city}
                          </span>
                          <span className="w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-br from-brand-gold-light to-brand-gold text-brand-midnight group-hover:scale-105 transition-transform">
                            <ArrowRight size={13} className={isRTL ? "rotate-180" : ""} />
                          </span>
                        </div>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>

    </main>
  );
}
