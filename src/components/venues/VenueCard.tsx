import { Link } from "@/i18n/routing";
import { MapPin, Users, Star } from "lucide-react";
import { VENUE_TYPE_LABEL } from "@/lib/constants";
import type { Venue } from "@/types";

interface VenueCardProps {
  venue: Venue;
  locale: string;
  t: (key: string) => string;
}

export default function VenueCard({ venue, locale, t }: VenueCardProps) {
  const isRTL = locale === "ar";
  const name = isRTL ? venue.name_ar : venue.name_en;
  const typeLabel = VENUE_TYPE_LABEL[venue.venue_type]?.[isRTL ? "ar" : "en"] ?? venue.venue_type;
  const nf = new Intl.NumberFormat(isRTL ? "ar-SA" : "en-US");

  return (
    <Link href={`/venues/${venue.id}`} className="group block">
      <div className="bg-white rounded-2xl border border-black/5 overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all h-full">
        <div className="h-40 bg-brand-sand relative overflow-hidden">
          {venue.cover_image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={venue.cover_image} alt={name} className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="w-14 h-14 rounded-xl bg-brand-gold/10 flex items-center justify-center text-brand-gold text-xl font-medium">
                {name?.charAt(0) ?? "V"}
              </div>
            </div>
          )}
          <span className="absolute top-3 start-3 text-xs bg-brand-midnight/80 text-white px-2.5 py-1 rounded-full backdrop-blur-sm">
            {typeLabel}
          </span>
          {venue.is_featured && (
            <span className="absolute top-3 end-3 text-xs bg-brand-gold/90 text-white px-2.5 py-1 rounded-full font-medium">
              {isRTL ? "مميز" : "Featured"}
            </span>
          )}
        </div>

        <div className="p-4 space-y-2">
          <h3 className="font-medium text-brand-midnight text-sm leading-snug line-clamp-1">{name}</h3>
          <div className="flex items-center justify-between text-xs text-brand-ink/50">
            <span className="flex items-center gap-1">
              <MapPin size={11} />
              {venue.city}
            </span>
            {venue.capacity_max ? (
              <span className="flex items-center gap-1">
                <Users size={11} />
                {t("venues.upTo")} {nf.format(venue.capacity_max)}
              </span>
            ) : venue.rating ? (
              <span className="flex items-center gap-1">
                <Star size={11} className="fill-brand-gold text-brand-gold" />
                {Number(venue.rating).toFixed(1)}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </Link>
  );
}
