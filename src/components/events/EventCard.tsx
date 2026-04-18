import { useLocale } from "next-intl";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { Calendar, MapPin } from "lucide-react";
import { Event } from "@/types";
import { formatDate, formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface EventCardProps {
  event: Event;
  minPrice?: number;
  currency?: string;
}

export default function EventCard({ event, minPrice, currency = "SAR" }: EventCardProps) {
  const t = useTranslations();
  const locale = useLocale();

  const title = locale === "ar" ? event.title_ar : event.title_en;
  const dateStr = formatDate(event.starts_at, locale === "ar" ? "ar-SA" : "en-US");

  return (
    <Link href={`/events/${event.id}`}>
      <div className="bg-white rounded-2xl border border-black/5 overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all group">

        {/* Cover */}
        <div className="relative h-44 bg-brand-sand overflow-hidden">
          {event.cover_image ? (
            <img
              src={event.cover_image}
              alt={title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <svg width="40" height="40" viewBox="0 0 34 34" fill="none" opacity="0.2">
                <circle cx="6"  cy="28" r="3"   fill="#C8973A"/>
                <circle cx="16" cy="18" r="4.5" fill="#C8973A"/>
                <circle cx="28" cy="6"  r="6"   fill="#C8973A"/>
              </svg>
            </div>
          )}

          {/* Badges */}
          <div className="absolute top-3 start-3 flex gap-1.5">
            {event.is_featured && (
              <span className="text-xs bg-brand-gold/90 text-white px-2.5 py-1 rounded-full font-medium backdrop-blur-sm">
                {t("events.featured")}
              </span>
            )}
            {event.is_free && (
              <span className="text-xs bg-white/90 text-brand-midnight px-2.5 py-1 rounded-full font-medium backdrop-blur-sm">
                {t("events.free")}
              </span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <h3 className="font-medium text-brand-midnight text-sm leading-snug line-clamp-2 mb-3">
            {title}
          </h3>

          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs text-brand-ink/50">
              <Calendar size={12} />
              <span>{dateStr}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-brand-ink/50">
              <MapPin size={12} />
              <span>{event.venue_city}</span>
            </div>
          </div>

          {/* Price */}
          {!event.is_free && minPrice !== undefined && (
            <div className="mt-3 pt-3 border-t border-black/5 flex items-center justify-between">
              <span className="text-xs text-brand-ink/40">{t("events.bookNow")}</span>
              <span className="text-sm font-medium text-brand-gold">
                {formatCurrency(minPrice, currency, locale === "ar" ? "ar-SA" : "en-US")}
              </span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
