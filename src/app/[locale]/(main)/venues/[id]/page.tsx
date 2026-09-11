import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { MapPin, Users, Globe, Instagram, Phone, MessageCircle, Navigation, Mail, ArrowLeft, ArrowRight, Tag } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import EventCard from "@/components/events/EventCard";
import { Link } from "@/i18n/routing";
import { VENUE_TYPE_LABEL } from "@/lib/constants";
import type { Venue, Event } from "@/types";

interface VenuePageProps {
  params: Promise<{ locale: string; id: string }>;
}

export default async function VenuePage({ params }: VenuePageProps) {
  const { id } = await params;
  const locale = await getLocale();
  const t = await getTranslations();
  const isRTL = locale === "ar";
  const supabase = await createClient();

  const { data } = await supabase
    .from("venues")
    .select("*")
    .eq("id", id)
    .eq("is_published", true)
    .single();

  if (!data) notFound();
  const venue = data as Venue;

  const { data: eventRows } = await supabase
    .from("events")
    .select("*")
    .eq("venue_id", venue.id)
    .eq("status", "published")
    .gte("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: true })
    .limit(8);
  const events = (eventRows ?? []) as Event[];

  const name = isRTL ? venue.name_ar : venue.name_en;
  const description = isRTL ? venue.description_ar : venue.description_en;
  const typeLabel = VENUE_TYPE_LABEL[venue.venue_type]?.[isRTL ? "ar" : "en"] ?? venue.venue_type;
  const nf = new Intl.NumberFormat(isRTL ? "ar-SA" : "en-US");
  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  const mapsHref =
    venue.google_maps_url ??
    (venue.lat && venue.lng
      ? `https://www.google.com/maps/search/?api=1&query=${venue.lat},${venue.lng}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${venue.name_en}, ${venue.city}`)}`);

  const waHref = venue.whatsapp ? `https://wa.me/${venue.whatsapp.replace(/[^\d]/g, "")}` : null;

  const capacity =
    venue.capacity_max
      ? venue.capacity_min && venue.capacity_min !== venue.capacity_max
        ? `${nf.format(venue.capacity_min)} – ${nf.format(venue.capacity_max)} ${t("venues.guests")}`
        : `${t("venues.upTo")} ${nf.format(venue.capacity_max)} ${t("venues.guests")}`
      : null;

  const contactBtn = "flex items-center gap-2 px-4 py-2.5 rounded-xl border border-black/10 bg-white text-sm text-brand-midnight hover:border-brand-gold/50 hover:bg-brand-sand transition-colors";

  return (
    <div className="min-h-screen bg-brand-warm-white">
      <Navbar />

      {/* Cover */}
      <div className="w-full h-64 md:h-96 bg-brand-sand relative overflow-hidden">
        {venue.cover_image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={venue.cover_image} alt={name} className="w-full h-full object-cover" />
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
          <span className="bg-brand-midnight/80 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur-sm">{typeLabel}</span>
          <span className="bg-brand-midnight/80 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur-sm flex items-center gap-1">
            <MapPin size={11} /> {venue.city}
          </span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <Link href="/venues" className="inline-flex items-center gap-1.5 text-xs text-brand-ink/50 hover:text-brand-gold mb-4">
          <BackIcon size={13} /> {t("venues.backToVenues")}
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-medium text-brand-midnight leading-snug">{name}</h1>
              {venue.address && (
                <p className="text-sm text-brand-ink/55 mt-2 flex items-center gap-1.5">
                  <MapPin size={14} className="text-brand-gold shrink-0" /> {venue.address}
                </p>
              )}
            </div>

            {/* Key facts */}
            <div className="bg-white rounded-2xl border border-black/5 p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {capacity && (
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-9 h-9 rounded-xl bg-brand-gold/10 flex items-center justify-center shrink-0">
                    <Users size={16} className="text-brand-gold" />
                  </div>
                  <div>
                    <p className="text-xs text-brand-ink/50">{t("venues.capacity")}</p>
                    <p className="font-medium text-brand-midnight">{capacity}</p>
                  </div>
                </div>
              )}
              {venue.price_range && (
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-9 h-9 rounded-xl bg-brand-gold/10 flex items-center justify-center shrink-0">
                    <Tag size={16} className="text-brand-gold" />
                  </div>
                  <div>
                    <p className="text-xs text-brand-ink/50">{t("venues.priceRange")}</p>
                    <p className="font-medium text-brand-midnight">{venue.price_range}</p>
                  </div>
                </div>
              )}
            </div>

            {description && (
              <div>
                <h2 className="text-lg font-medium text-brand-midnight mb-3">{t("venues.about")}</h2>
                <p className="text-sm text-brand-ink/70 leading-relaxed whitespace-pre-line">{description}</p>
              </div>
            )}

            {venue.amenities?.length > 0 && (
              <div>
                <h2 className="text-lg font-medium text-brand-midnight mb-3">{t("venues.amenities")}</h2>
                <div className="flex flex-wrap gap-2">
                  {venue.amenities.map((a) => (
                    <span key={a} className="text-xs bg-white border border-black/10 text-brand-ink/70 px-3 py-1.5 rounded-full">{a}</span>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h2 className="text-lg font-medium text-brand-midnight mb-3">{t("venues.upcomingEvents")}</h2>
              {events.length === 0 ? (
                <div className="bg-white rounded-2xl border border-black/5 p-8 text-center text-sm text-brand-ink/50">
                  {t("venues.noUpcoming")}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {events.map((event) => <EventCard key={event.id} event={event} />)}
                </div>
              )}
            </div>
          </div>

          {/* Contact sidebar */}
          <aside className="space-y-3">
            <div className="bg-white rounded-2xl border border-black/5 p-5 space-y-3">
              <h2 className="text-sm font-medium text-brand-midnight">{t("venues.contact")}</h2>
              <div className="flex flex-col gap-2">
                {venue.website_url && (
                  <a href={venue.website_url} target="_blank" rel="noopener noreferrer" className={contactBtn}>
                    <Globe size={15} className="text-brand-gold" /> {t("venues.website")}
                  </a>
                )}
                {venue.instagram_url && (
                  <a href={venue.instagram_url} target="_blank" rel="noopener noreferrer" className={contactBtn}>
                    <Instagram size={15} className="text-brand-gold" /> {t("venues.instagram")}
                  </a>
                )}
                {venue.phone && (
                  <a href={`tel:${venue.phone}`} className={contactBtn}>
                    <Phone size={15} className="text-brand-gold" /> {t("venues.call")}
                    <span className="ms-auto text-xs text-brand-ink/50" dir="ltr">{venue.phone}</span>
                  </a>
                )}
                {waHref && (
                  <a href={waHref} target="_blank" rel="noopener noreferrer" className={contactBtn}>
                    <MessageCircle size={15} className="text-brand-gold" /> {t("venues.whatsapp")}
                  </a>
                )}
                {venue.email && (
                  <a href={`mailto:${venue.email}`} className={contactBtn}>
                    <Mail size={15} className="text-brand-gold" /> {venue.email}
                  </a>
                )}
                <a href={mapsHref} target="_blank" rel="noopener noreferrer" className={contactBtn}>
                  <Navigation size={15} className="text-brand-gold" /> {t("venues.directions")}
                </a>
              </div>
            </div>

            {venue.source_url && (
              <p className="text-[11px] text-brand-ink/40 px-1">
                {t("venues.source")}:{" "}
                <a href={venue.source_url} target="_blank" rel="noopener noreferrer" className="underline hover:text-brand-gold break-all">
                  {new URL(venue.source_url).hostname}
                </a>
              </p>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
