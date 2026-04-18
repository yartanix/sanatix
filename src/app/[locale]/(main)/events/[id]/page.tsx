import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Calendar, MapPin, Clock, Share2, Heart } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import TicketSelector from "@/components/events/TicketSelector";
import { formatDate, formatDateTime } from "@/lib/utils";

interface EventPageProps {
  params: Promise<{ locale: string; id: string }>;
}

export default async function EventPage({ params }: EventPageProps) {
  const { id } = await params;
  const locale = await getLocale();
  const t = await getTranslations();
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select(`*, profiles(full_name, avatar_url), ticket_types(*)`)
    .eq("id", id)
    .eq("status", "published")
    .single();

  if (!event) notFound();

  const title = locale === "ar" ? event.title_ar : event.title_en;
  const description = locale === "ar" ? event.description_ar : event.description_en;
  const isRTL = locale === "ar";

  const minPrice = event.ticket_types?.length
    ? Math.min(...event.ticket_types.map((t: { price: number }) => t.price))
    : 0;

  return (
    <div className="min-h-screen bg-brand-warm-white">
      <Navbar />

      {/* Cover image */}
      <div className="w-full h-72 md:h-96 bg-brand-sand relative overflow-hidden">
        {event.cover_image ? (
          <img src={event.cover_image} alt={title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg width="60" height="60" viewBox="0 0 34 34" fill="none" opacity="0.15">
              <circle cx="6"  cy="28" r="3"   fill="#C8973A"/>
              <circle cx="16" cy="18" r="4.5" fill="#C8973A"/>
              <circle cx="28" cy="6"  r="6"   fill="#C8973A"/>
            </svg>
          </div>
        )}
        <div className="absolute bottom-4 start-4">
          <span className="bg-brand-midnight/80 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur-sm capitalize">
            {event.category}
          </span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-3 gap-8">

          {/* Left — Event info */}
          <div className="lg:col-span-2 space-y-6">

            {/* Title + actions */}
            <div className="flex items-start justify-between gap-4">
              <div>
                {event.is_featured && (
                  <span className="text-xs bg-brand-gold/10 text-brand-gold px-2.5 py-1 rounded-full font-medium mb-2 inline-block">
                    {t("events.featured")}
                  </span>
                )}
                <h1 className="text-2xl md:text-3xl font-medium text-brand-midnight leading-snug">
                  {title}
                </h1>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button className="p-2.5 rounded-xl border border-black/10 bg-white hover:bg-brand-sand transition-colors">
                  <Heart size={18} className="text-brand-ink/50" />
                </button>
                <button className="p-2.5 rounded-xl border border-black/10 bg-white hover:bg-brand-sand transition-colors">
                  <Share2 size={18} className="text-brand-ink/50" />
                </button>
              </div>
            </div>

            {/* Meta info */}
            <div className="bg-white rounded-2xl border border-black/5 p-5 space-y-3">
              <div className="flex items-center gap-3 text-sm text-brand-ink/70">
                <div className="w-9 h-9 rounded-xl bg-brand-gold/10 flex items-center justify-center shrink-0">
                  <Calendar size={16} className="text-brand-gold" />
                </div>
                <div>
                  <p className="font-medium text-brand-midnight">
                    {formatDate(event.starts_at, isRTL ? "ar-SA" : "en-US")}
                  </p>
                  <p className="text-xs text-brand-ink/50">
                    {formatDateTime(event.starts_at, isRTL ? "ar-SA" : "en-US")}
                    {" — }"
                    {formatDateTime(event.ends_at, isRTL ? "ar-SA" : "en-US")}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-sm text-brand-ink/70">
                <div className="w-9 h-9 rounded-xl bg-brand-gold/10 flex items-center justify-center shrink-0">
                  <MapPin size={16} className="text-brand-gold" />
                </div>
                <div>
                  <p className="font-medium text-brand-midnight">{event.venue_name || t("events.title")}</p>
                  <p className="text-xs text-brand-ink/50">{event.venue_city}</p>
                </div>
              </div>
            </div>

            {/* Description */}
            {description && (
              <div>
                <h2 className="text-lg font-medium text-brand-midnight mb-3">
                  {isRTL ? "عن الفعطالية" : "About this event"}
                </h2>
                <p className="text-sm text-brand-ink/70 leading-relaxed whitespace-pre-line">
                  {description}
                </p>
              </div>
            )}

            {/* Organizer */}
            {event.profiles && (
              <div>
                <h2 className="text-lg font-medium text-brand-midnight mb-3">
                  {isRTL ? "ةمنحم" : "Organizer"}
                </h2>
                <div className="flex items-center gap-3 bg-white rounded-2xl border border-black/5 p-4">
                  <div className="w-11 h-11 rounded-xl bg-brand-gold/10 flex items-center justify-center font-medium text-brand-gold">
                    {event.profiles.full_name?.charAt(0) ?? "S"}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-brand-midnight">
                      {event.profiles.full_name ?? "Sanatix Organizer"}
                    </p>
                    <p className="text-xs text-brand-ink/50">
                      {isRTL ? "منظم فئاليات" : "Event Organizer"}
                    </p>
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* Right — Ticket selector (sticky) */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <TicketSelector
                eventId={event.id}
                ticketTypes={event.ticket_types ?? []}
                isFree={event.is_free}
                locale={locale}
              />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
