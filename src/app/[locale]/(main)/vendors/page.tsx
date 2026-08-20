import { createClient } from "@/lib/supabase/server";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { Search, MapPin, Star } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import { VENDOR_CATEGORIES, VENDOR_CATEGORY_LABEL } from "@/lib/constants";

interface PageProps {
  searchParams: Promise<{ category?: string; city?: string; q?: string }>;
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
    .order("is_featured", { ascending: false })
    .order("rating", { ascending: false });

  if (city)     query = query.eq("city", city);
  if (category) query = query.eq("category", category);
  if (q)        query = query.or(`name_ar.ilike.%${q}%,name_en.ilike.%${q}%`);

  const { data: vendors } = await query;

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
          <p className="text-brand-ink/55 text-sm">
            {isRTL ? "اعثر على موردين موثوقين للفعاليات في الخليج" : "Find trusted event suppliers across the GCC"}
          </p>
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
            placeholder={isRTL ? "ابحث عن مورد بالاسم أو الخدمة..." : "Search vendors by name or service..."}
            className="w-full ps-11 pe-4 py-3 rounded-xl border border-black/10 bg-white text-sm text-brand-midnight placeholder:text-brand-ink/35 focus:outline-none focus:ring-2 focus:ring-brand-gold/30"
          />
        </form>

        {/* Category chips */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-8">
          <Link
            href={buildHref({ category: undefined })}
            className={`shrink-0 px-4 py-2 rounded-full text-sm border transition-colors ${
              !category ? "bg-brand-midnight text-white border-brand-midnight" : "bg-white text-brand-ink/65 border-black/10 hover:border-brand-gold/50"
            }`}
          >
            {isRTL ? "كل الخدمات" : "All Services"}
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
        {!vendors || vendors.length === 0 ? (
          <div className="bg-white rounded-2xl border border-black/5 p-16 text-center">
            <p className="text-brand-ink/60 text-sm mb-1">
              {isRTL ? "لا يوجد موردون بعد" : "No vendors yet"}
            </p>
            <p className="text-brand-ink/40 text-xs">
              {isRTL ? "سيظهر الموردون هنا بمجرد انضمامهم للمنصة" : "Vendors will appear here once they join the platform"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {vendors.map((vendor) => {
              const name = isRTL ? vendor.name_ar : vendor.name_en;
              return (
                <div key={vendor.id} className="bg-white rounded-2xl border border-black/5 overflow-hidden hover:shadow-md transition-shadow">
                  <div className="h-32 bg-brand-sand flex items-center justify-center relative">
                    {vendor.logo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={vendor.logo} alt={name} className="w-14 h-14 rounded-xl object-cover" />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-brand-gold/10 flex items-center justify-center font-medium text-brand-gold text-lg">
                        {name?.charAt(0) ?? "V"}
                      </div>
                    )}
                    {vendor.is_verified && (
                      <span className="absolute top-3 start-3 text-xs bg-emerald-500/90 text-white px-2 py-0.5 rounded-full font-medium">
                        {t("vendors.verified")}
                      </span>
                    )}
                  </div>
                  <div className="p-4 space-y-1.5">
                    <p className="font-medium text-brand-midnight text-sm truncate">{name}</p>
                    <p className="text-xs text-brand-ink/50 capitalize">
                      {VENDOR_CATEGORY_LABEL[vendor.category]?.[isRTL ? "ar" : "en"] ?? vendor.category}
                    </p>
                    <div className="flex items-center justify-between pt-1">
                      {vendor.city && (
                        <span className="flex items-center gap-1 text-xs text-brand-ink/40">
                          <MapPin size={11} />
                          {vendor.city}
                        </span>
                      )}
                      {vendor.rating > 0 && (
                        <span className="flex items-center gap-1 text-xs text-brand-ink/60">
                          <Star size={11} className="fill-brand-gold text-brand-gold" />
                          {vendor.rating.toFixed(1)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}
