import { useTranslations } from "next-intl";
import { Search, SlidersHorizontal } from "lucide-react";
import Navbar from "@/components/layout/Navbar";

const CATEGORIES = [
  "all", "music", "sports", "art", "food", "business", "family", "tech", "fashion"
];

export default function EventsPage() {
  const t = useTranslations();

  return (
    <div className="min-h-screen bg-brand-warm-white">
      <Navbar />

      <div className="max-w-6xl mx-auto px-6 py-10">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-medium text-brand-midnight mb-2">{t("events.title")}</h1>
          <p className="text-brand-ink/55 text-sm">Discover events happening across the GCC</p>
        </div>

        {/* Search + Filter bar */}
        <div className="flex gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute start-4 top-1/2 -translate-y-1/2 text-brand-ink/35 w-4 h-4" />
            <input
              type="text"
              placeholder={t("home.searchPlaceholder")}
              className="w-full ps-11 pe-4 py-3 rounded-xl border border-black/10 bg-white text-sm text-brand-midnight placeholder:text-brand-ink/35 focus:outline-none focus:ring-2 focus:ring-brand-gold/30"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-3 rounded-xl border border-black/10 bg-white text-sm text-brand-ink/70 hover:bg-brand-sand transition-colors">
            <SlidersHorizontal size={15} />
            {t("events.filters")}
          </button>
        </div>

        {/* Category chips */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-8 scrollbar-hide">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              className={`shrink-0 px-4 py-2 rounded-full text-sm border transition-colors capitalize ${
                cat === "all"
                  ? "bg-brand-midnight text-white border-brand-midnight"
                  : "bg-white text-brand-ink/65 border-black/10 hover:border-brand-gold/50"
              }`}
            >
              {cat === "all" ? "All Events" : cat}
            </button>
          ))}
        </div>

        {/* City tabs */}
        <div className="flex gap-6 border-b border-black/8 mb-8 text-sm">
          {["All Cities", "Riyadh", "Jeddah", "Dubai", "Abu Dhabi", "Kuwait"].map((city) => (
            <button
              key={city}
              className={`pb-3 border-b-2 transition-colors ${
                city === "All Cities"
                  ? "border-brand-gold text-brand-midnight font-medium -mb-px"
                  : "border-transparent text-brand-ink/50 hover:text-brand-midnight"
              }`}
            >
              {city}
            </button>
          ))}
        </div>

        {/* Events grid — skeleton placeholders */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-black/5 overflow-hidden">
              <div className="h-44 bg-brand-sand animate-pulse" />
              <div className="p-4 space-y-2">
                <div className="h-4 bg-brand-sand rounded-lg w-3/4 animate-pulse" />
                <div className="h-3 bg-brand-sand rounded-lg w-1/2 animate-pulse" />
                <div className="h-3 bg-brand-sand rounded-lg w-2/5 animate-pulse" />
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
