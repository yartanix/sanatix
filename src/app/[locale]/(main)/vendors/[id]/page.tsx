import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { MapPin, Globe, Instagram, MessageCircle, Star, ArrowLeft, ArrowRight } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import VendorCard from "@/components/vendors/VendorCard";
import { Link } from "@/i18n/routing";
import { VENDOR_CATEGORY_LABEL, SITE_URL } from "@/lib/constants";
import { buildMetadata, trimDescription, jsonLd } from "@/lib/seo";
import type { Vendor, Review } from "@/types";

interface VendorPageProps {
  params: Promise<{ locale: string; id: string }>;
}

export async function generateMetadata({ params }: VendorPageProps): Promise<Metadata> {
  const { id } = await params;
  const locale = await getLocale();
  const isRTL = locale === "ar";
  const supabase = await createClient();
  const { data: vendor } = await supabase
    .from("vendors")
    .select("name_ar, name_en, description_ar, description_en, cover_url, logo_url, city, category")
    .eq("id", id)
    .eq("is_verified", true)
    .single();

  if (!vendor) return buildMetadata({ path: `/vendors/${id}`, locale, title: "Sanatix", description: "" });

  const name = isRTL ? vendor.name_ar : vendor.name_en;
  const categoryLabel = VENDOR_CATEGORY_LABEL[vendor.category]?.[isRTL ? "ar" : "en"] ?? vendor.category;
  const description = trimDescription(isRTL ? vendor.description_ar : vendor.description_en) ||
    (isRTL ? `${name} — ${categoryLabel} في ${vendor.city}` : `${name} — ${categoryLabel} in ${vendor.city}`);

  return buildMetadata({
    path: `/vendors/${id}`,
    locale,
    title: `${name} | Sanatix`,
    description,
    image: vendor.cover_url ?? vendor.logo_url,
  });
}

export default async function VendorPage({ params }: VendorPageProps) {
  const { id } = await params;
  const locale = await getLocale();
  const t = await getTranslations();
  const isRTL = locale === "ar";
  const supabase = await createClient();

  const { data } = await supabase
    .from("vendors")
    .select("*")
    .eq("id", id)
    .eq("is_verified", true)
    .single();

  if (!data) notFound();
  const vendor = data as Vendor;

  const [{ data: reviewRows }, { data: similarRows }] = await Promise.all([
    supabase
      .from("reviews")
      .select("*, profiles(full_name, avatar_url)")
      .eq("vendor_id", vendor.id)
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("vendors")
      .select("*")
      .eq("category", vendor.category)
      .eq("is_verified", true)
      .neq("id", vendor.id)
      .limit(4),
  ]);
  const reviews = (reviewRows ?? []) as Review[];
  const similarVendors = (similarRows ?? []) as Vendor[];

  const name = isRTL ? vendor.name_ar : vendor.name_en;
  const description = isRTL ? vendor.description_ar : vendor.description_en;
  const categoryLabel = VENDOR_CATEGORY_LABEL[vendor.category]?.[isRTL ? "ar" : "en"] ?? vendor.category;
  const BackIcon = isRTL ? ArrowRight : ArrowLeft;
  const waHref = vendor.whatsapp ? `https://wa.me/${vendor.whatsapp.replace(/[^\d]/g, "")}` : null;

  const contactBtn = "flex items-center gap-2 px-4 py-2.5 rounded-xl border border-black/10 bg-white text-sm text-brand-midnight hover:border-brand-gold/50 hover:bg-brand-sand transition-colors";

  const vendorSchema = jsonLd({
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name,
    description: description ?? undefined,
    image: vendor.cover_url ? [vendor.cover_url] : vendor.logo_url ? [vendor.logo_url] : undefined,
    url: `${SITE_URL}/vendors/${vendor.id}`,
    address: {
      "@type": "PostalAddress",
      addressLocality: vendor.city,
      addressCountry: vendor.country,
    },
    aggregateRating: vendor.rating
      ? { "@type": "AggregateRating", ratingValue: vendor.rating, reviewCount: vendor.review_count || 1 }
      : undefined,
  });

  return (
    <div className="min-h-screen bg-brand-warm-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={vendorSchema} />
      <Navbar />

      {/* Cover */}
      <div className="w-full h-56 md:h-80 bg-brand-sand relative overflow-hidden">
        {vendor.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={vendor.cover_url} alt={name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg width="60" height="60" viewBox="0 0 34 34" fill="none" opacity="0.15">
              <circle cx="6"  cy="28" r="3"   fill="#C8973A"/>
              <circle cx="16" cy="18" r="4.5" fill="#C8973A"/>
              <circle cx="28" cy="6"  r="6"   fill="#C8973A"/>
            </svg>
          </div>
        )}
        <div className="absolute bottom-4 start-4 flex gap-2">
          <span className="bg-brand-midnight/80 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur-sm capitalize">{categoryLabel}</span>
          <span className="bg-brand-midnight/80 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur-sm flex items-center gap-1">
            <MapPin size={11} /> {vendor.city}
          </span>
          {vendor.is_verified && (
            <span className="bg-emerald-500/90 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur-sm font-medium">
              {t("vendors.verified")}
            </span>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <Link href="/vendors" className="inline-flex items-center gap-1.5 text-xs text-brand-ink/50 hover:text-brand-gold mb-4">
          <BackIcon size={13} /> {t("vendors.backToVendors")}
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-start gap-4">
              {vendor.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={vendor.logo_url} alt={name} className="w-16 h-16 rounded-2xl object-cover border border-black/5 shrink-0" />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-brand-gold/10 flex items-center justify-center font-medium text-brand-gold text-2xl shrink-0">
                  {name?.charAt(0) ?? "V"}
                </div>
              )}
              <div>
                <h1 className="text-2xl md:text-3xl font-medium text-brand-midnight leading-snug">{name}</h1>
                {vendor.rating ? (
                  <p className="text-sm text-brand-ink/55 mt-1.5 flex items-center gap-1.5">
                    <Star size={14} className="fill-brand-gold text-brand-gold shrink-0" />
                    {Number(vendor.rating).toFixed(1)}
                    <span className="text-brand-ink/40">
                      ({vendor.review_count} {t("vendors.reviews").toLowerCase()})
                    </span>
                  </p>
                ) : null}
              </div>
            </div>

            {description && (
              <div>
                <h2 className="text-lg font-medium text-brand-midnight mb-3">{t("vendors.about")}</h2>
                <p className="text-sm text-brand-ink/70 leading-relaxed whitespace-pre-line">{description}</p>
              </div>
            )}

            <div>
              <h2 className="text-lg font-medium text-brand-midnight mb-3">{t("vendors.reviews")}</h2>
              {reviews.length === 0 ? (
                <div className="bg-white rounded-2xl border border-black/5 p-8 text-center text-sm text-brand-ink/50">
                  {t("vendors.noReviews")}
                </div>
              ) : (
                <div className="space-y-3">
                  {reviews.map((review) => {
                    const reviewerName = review.profiles?.full_name ?? (isRTL ? "مستخدم" : "User");
                    const comment = isRTL ? review.comment_ar : review.comment_en;
                    return (
                      <div key={review.id} className="bg-white rounded-2xl border border-black/5 p-4">
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="font-medium text-brand-midnight text-sm">{reviewerName}</p>
                          <div className="flex items-center gap-0.5">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                size={12}
                                className={i < review.rating ? "fill-brand-gold text-brand-gold" : "text-brand-ink/15"}
                              />
                            ))}
                          </div>
                        </div>
                        {comment && <p className="text-sm text-brand-ink/65 leading-relaxed">{comment}</p>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {similarVendors.length > 0 && (
              <div>
                <h2 className="text-lg font-medium text-brand-midnight mb-3">{t("vendors.similarVendors")}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {similarVendors.map((v) => (
                    <VendorCard key={v.id} vendor={v} locale={locale} t={t} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Contact sidebar */}
          <aside className="space-y-3">
            <div className="bg-white rounded-2xl border border-black/5 p-5 space-y-3">
              <h2 className="text-sm font-medium text-brand-midnight">{t("vendors.contact")}</h2>
              <div className="flex flex-col gap-2">
                {vendor.website_url && (
                  <a href={vendor.website_url} target="_blank" rel="noopener noreferrer" className={contactBtn}>
                    <Globe size={15} className="text-brand-gold" /> {t("vendors.website")}
                  </a>
                )}
                {vendor.instagram_url && (
                  <a href={vendor.instagram_url} target="_blank" rel="noopener noreferrer" className={contactBtn}>
                    <Instagram size={15} className="text-brand-gold" /> {t("vendors.instagram")}
                  </a>
                )}
                {waHref && (
                  <a href={waHref} target="_blank" rel="noopener noreferrer" className={contactBtn}>
                    <MessageCircle size={15} className="text-brand-gold" /> {t("vendors.whatsapp")}
                  </a>
                )}
                {!vendor.website_url && !vendor.instagram_url && !waHref && (
                  <p className="text-xs text-brand-ink/40">
                    {isRTL ? "لا توجد معلومات تواصل متاحة حالياً" : "No contact details available yet"}
                  </p>
                )}
              </div>
            </div>

            {vendor.source_url && (
              <p className="text-[11px] text-brand-ink/40 px-1">
                {t("vendors.source")}:{" "}
                <a href={vendor.source_url} target="_blank" rel="noopener noreferrer" className="underline hover:text-brand-gold break-all">
                  {new URL(vendor.source_url).hostname}
                </a>
              </p>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
