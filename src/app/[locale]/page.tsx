import { useTranslations } from "next-intl";
import { Search } from "lucide-react";
import { Link } from "@/i18n/routing";

export default function HomePage() {
  const t = useTranslations();

  return (
    <main className="min-h-screen bg-brand-warm-white">

      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-brand-warm-white/90 backdrop-blur border-b border-black/5 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Logo mark */}
            <svg width="32" height="32" viewBox="0 0 34 34" fill="none">
              <circle cx="6"  cy="28" r="3"   fill="#C8973A" opacity="0.45"/>
              <circle cx="16" cy="18" r="4.5" fill="#C8973A" opacity="0.72"/>
              <circle cx="28" cy="6"  r="6"   fill="#C8973A"/>
              <circle cx="28" cy="6"  r="10"  stroke="#C8973A" strokeWidth="0.75" opacity="0.22" strokeDasharray="2.5 2"/>
              <line x1="9"  y1="26" x2="13" y2="21" stroke="#C8973A" strokeWidth="0.85" opacity="0.42"/>
              <line x1="19" y1="15" x2="23" y2="10" stroke="#C8973A" strokeWidth="0.85" opacity="0.42"/>
            </svg>
            <span className="text-xl font-medium tracking-tight text-brand-midnight">sanatix</span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm text-brand-ink/70">
            <Link href="/events">{t("nav.events")}</Link>
            <Link href="/vendors">{t("nav.vendors")}</Link>
            <Link href="/organizers">{t("nav.organizers")}</Link>
            <Link href="/crowdfunding">{t("nav.crowdfunding")}</Link>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-brand-ink/70 hover:text-brand-midnight transition-colors">
              {t("common.login")}
            </Link>
            <Link
              href="/register"
              className="text-sm bg-brand-gold text-white px-4 py-2 rounded-full hover:bg-brand-gold/90 transition-colors"
            >
              {t("common.register")}
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-16 text-center">
        <h1 className="text-5xl md:text-6xl font-medium tracking-tight text-brand-midnight mb-4">
          {t("home.hero")}
        </h1>
        <p className="text-lg text-brand-ink/60 mb-10 max-w-xl mx-auto">
          {t("home.heroSub")}
        </p>

        {/* Search bar */}
        <div className="max-w-2xl mx-auto relative">
          <Search className="absolute start-4 top-1/2 -translate-y-1/2 text-brand-ink/40 w-5 h-5" />
          <input
            type="text"
            placeholder={t("home.searchPlaceholder")}
            className="w-full ps-12 pe-6 py-4 rounded-2xl border border-black/10 bg-white shadow-sm text-brand-midnight placeholder:text-brand-ink/40 focus:outline-none focus:ring-2 focus:ring-brand-gold/30 text-base"
          />
        </div>
      </section>

      {/* Featured Events placeholder */}
      <section className="max-w-6xl mx-auto px-6 pb-20">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-medium text-brand-midnight">{t("home.featuredEvents")}</h2>
          <Link href="/events" className="text-sm text-brand-gold hover:underline">{t("common.viewAll")}</Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-black/5 overflow-hidden hover:shadow-md transition-shadow">
              <div className="h-44 bg-brand-sand animate-pulse" />
              <div className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs bg-brand-gold/10 text-brand-gold px-2.5 py-1 rounded-full font-medium">
                    {t("events.featured")}
                  </span>
                </div>
                <div className="h-4 bg-brand-sand rounded w-3/4 mb-2 animate-pulse" />
                <div className="h-3 bg-brand-sand rounded w-1/2 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </section>

    </main>
  );
}
