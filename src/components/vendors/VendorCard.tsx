import { Link } from "@/i18n/routing";
import { MapPin, Star } from "lucide-react";
import { VENDOR_CATEGORY_LABEL } from "@/lib/constants";
import type { Vendor } from "@/types";

interface VendorCardProps {
  vendor: Vendor;
  locale: string;
  t: (key: string) => string;
}

export default function VendorCard({ vendor, locale, t }: VendorCardProps) {
  const isRTL = locale === "ar";
  const name = isRTL ? vendor.name_ar : vendor.name_en;

  return (
    <Link href={`/vendors/${vendor.id}`} className="group block">
      <div className="bg-white rounded-2xl border border-black/5 overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all h-full">
        <div className="h-32 bg-brand-sand flex items-center justify-center relative">
          {vendor.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={vendor.logo_url} alt={name} className="w-14 h-14 rounded-xl object-cover" />
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
          <p className="font-medium text-brand-midnight text-sm truncate group-hover:text-brand-gold transition-colors">{name}</p>
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
            {vendor.rating ? (
              <span className="flex items-center gap-1 text-xs text-brand-ink/60">
                <Star size={11} className="fill-brand-gold text-brand-gold" />
                {Number(vendor.rating).toFixed(1)}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </Link>
  );
}
