import { useTranslations } from "next-intl";
import { Search } from "lucide-react";
import Navbar from "@/components/layout/Navbar";

const VENDOR_CATEGORIES = [
  "all", "catering", "photography", "decoration", "sound & lighting",
  "venue", "entertainment", "flowers", "transport", "printing"
];

export default function VendorsPage() {
  const t = useTranslations();

  return (
    <div className="min-h-screen bg-brand-warm-white">
      <Navbar />

      <div className="max-w-6xl mx-auto px-6 py-10">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-medium text-brand-midnight mb-2">{t("vendors.title")}</h1>
          <p className="text-brand-ink/55 text-sm">Find trusted event suppliers across the GCC</p>
        </div>

        {/* Search */}
        <div className="relative max-w-xl mb-6">
          <Search className="absolute start-4 top-1/2 -translate-y-1/2 text-brand-ink/35 w-4 h-4" />
          <input
            type="text"
            placeholder="Search vendors by name or service..."
            className="w-full ps-11 pe-4 py-3 rounded-xl border border-black/10 bg-white text-sm text-brand-midnight placeholder:text-brand-ink/35 focus:outline-none focus:ring-2 focus:ring-brand-gold/30"
          />
        </div>

        {/* Category chips */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-8">
          {VENDOR_CATEGORIES.map((cat) => (
            <button
              key={cat}
              className={`shrink-0 px-4 py-2 rounded-full text-sm border transition-colors capitalize ${
                cat === "all"
                  ? "bg-brand-midnight text-white border-brand-midnight"
                  : "bg-white text-brand-ink/65 border-black/10 hover:border-brand-gold/50"
              }`}
            >
              {cat === "all" ? "All Services" : cat}
            </button>
          ))}
        </div>

        {/* Vendors grid — skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-black/5 overflow-hidden">
              <div className="h-32 bg-brand-sand animate-pulse flex items-center justify-center">
                <div className="w-14 h-14 rounded-xl bg-brand-sand/80 animate-pulse" />
              </div>
              <div className="p-4 space-y-2">
                <div className="h-4 bg-brand-sand rounded-lg w-2/3 animate-pulse" />
                <div className="h-3 bg-brand-sand rounded-lg w-full animate-pulse" />
                <div className="h-3 bg-brand-sand rounded-lg w-3/4 animate-pulse" />
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
