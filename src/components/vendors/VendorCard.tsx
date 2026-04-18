import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { Star, MapPin, BadgeCheck } from "lucide-react";
import { Vendor } from "@/types";

interface VendorCardProps {
  vendor: Vendor;
}

export default function VendorCard({ vendor }: VendorCardProps) {
  const t = useTranslations();
  const locale = useLocale();

  const name = locale === "ar" ? vendor.name_ar : vendor.name_en;
  const description = locale === "ar" ? vendor.description_ar : vendor.description_en;

  return (
    <Link href={`/vendors/${vendor.id}`}>
      <div className="bg-white rounded-2xl border border-black/5 overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all group">

        {/* Logo / Cover */}
        <div className="h-32 bg-brand-sand flex items-center justify-center relative overflow-hidden">
          {vendor.logo_url ? (
            <img
              src={vendor.logo_url}
              alt={name}
              className="w-16 h-16 rounded-xl object-contain"
            />
          ) : (
            <div className="w-14 h-14 rounded-xl bg-brand-gold/10 flex items-center justify-center">
              <span className="text-2xl font-medium text-brand-gold">
                {name.charAt(0)}
              </span>
            </div>
          )}

          {vendor.is_featured && (
            <div className="absolute top-3 end-3">
              <span className="text-xs bg-brand-gold/90 text-white px-2.5 py-1 rounded-full font-medium">
                Featured
              </span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-4">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-medium text-brand-midnight text-sm leading-snug line-clamp-1">
              {name}
            </h3>
            {vendor.is_verified && (
              <BadgeCheck size={16} className="text-brand-gold shrink-0 mt-0.5" />
            )}
          </div>

          {description && (
            <p className="text-xs text-brand-ink/50 line-clamp-2 mb-3">{description}</p>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-xs text-brand-ink/50">
              <MapPin size={11} />
              <span>{vendor.city}</span>
            </div>
            {vendor.rating && (
              <div className="flex items-center gap-1 text-xs">
                <Star size={11} className="text-brand-gold fill-brand-gold" />
                <span className="font-medium text-brand-midnight">{vendor.rating.toFixed(1)}</span>
                <span className="text-brand-ink/40">({vendor.review_count})</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
