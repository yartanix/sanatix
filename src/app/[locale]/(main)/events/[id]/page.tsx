import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Calendar, MapPin, ExternalLink, Star } from "lucide-react";
import { Link } from "@/i18n/routing";
import Navbar from "@/components/layout/Navbar";
import TicketSelector from "@/components/events/TicketSelector";
import ReviewForm from "@/components/events/ReviewForm";
import EventActions from "@/components/events/EventActions";
import { formatDate, formatDateTime } from "@/lib/utils";
import type { Review } from "@/types";

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
    .select(`*, profiles(full_name), ticket_types(*), venues(id, name_ar, name_en, address)`)
    .eq("id", id)
    .eq("status", "published")
    .single();

  if (!event) notFound();

  const title = locale === "ar" ? event.title_ar : event.title_en;
  const description = locale === "ar" ? event.description_ar : event.description_en;
  const isRTL = locale === "ar";

  const { data: { user } } = await supabase.auth.getUser();
  const [{ data: reviewRows }, { data: canReviewBooking }, { data: favoriteRow }] = await Promise.all([
    supabase
      .from("reviews")
      .select("*, profiles(full_name, avatar_url)")
      .eq("event_id", event.id)
      .order("created_at", { ascending: false })
      .limit(10),
    user
      ? supabase
          .from("bookings")
          .select("id")
          .eq("user_id", user.id)
          .eq("event_id", event.id)
          .neq("status", "cancelled")
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    user
      ? supabase
          .from("favorites")
          .select("id")
          .eq("user_id", user.id)
          .eq("event_id", event.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const reviews = (reviewRows ?? []) as Review[];
  const myReview = user ? reviews.find((r) => r.user_id === user.id) ?? null : null;
  const avgRating = reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : null;
  const isSaved = Boolean(favoriteRow);

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
              <EventActions eventId={event.id} initiallySaved={isSaved} title={title} isRTL={isRTL} />
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
                    {" — "}
                    {formatDateTime(event.ends_at, isRTL ? "ar-SA" : "en-US")}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-sm text-brand-ink/70">
                <div className="w-9 h-9 rounded-xl bg-brand-gold/10 flex items-center justify-center shrink-0">
                  <MapPin size={16} className="text-brand-gold" />
                </div>
                <div>
                  {event.venues ? (
                    <Link href={`/venues/${event.venues.id}`} className="font-medium text-brand-midnight hover:text-brand-gold transition-colors">
                      {isRTL ? event.venues.name_ar : event.venues.name_en}
                    </Link>
                  ) : (
                    <p className="font-medium text-brand-midnight">{event.venue_name || t("events.title")}</p>
                  )}
                  <p className="text-xs text-brand-ink/50">
                    {event.venues?.address ? `${event.venues.address}, ` : ""}{event.venue_city}
                  </p>
                </div>
              </div>
            </div>

            {/* Description */}
            {description && (
              <div>
                <h2 className="text-lg font-medium text-brand-midnight mb-3">
                  {isRTL ? "عن الفعالية" : "About this event"}
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
                  {isRTL ? "المنظم" : "Organizer"}
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
                      {isRTL ? "منظم فعاليات" : "Event Organizer"}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Reviews */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-lg font-medium text-brand-midnight">
                  {isRTL ? "التقييمات" : "Reviews"}
                </h2>
                {avgRating !== null && (
                  <span className="flex items-center gap-1 text-sm text-brand-ink/60">
                    <Star size={14} className="text-brand-gold fill-brand-gold" />
                    {avgRating.toFixed(1)} · {reviews.length}
                  </span>
                )}
              </div>

              <div className="space-y-3 mb-4">
                {reviews.length === 0 ? (
                  <p className="text-sm text-brand-ink/40">
                    {isRTL ? "لا توجد تقييمات بعد" : "No reviews yet"}
                  </p>
                ) : (
                  reviews.map((r) => {
                    const comment = isRTL ? r.comment_ar : r.comment_en;
                    return (
                      <div key={r.id} className="bg-white rounded-2xl border border-black/5 p-4">
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="text-sm font-medium text-brand-midnight">
                            {r.user_id === user?.id
                              ? (isRTL ? "أنت" : "You")
                              : r.profiles?.full_name ?? (isRTL ? "مستخدم" : "User")}
                          </p>
                          <div className="flex items-center gap-0.5">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                size={12}
                                className={i < r.rating ? "text-brand-gold fill-brand-gold" : "text-brand-ink/15"}
                              />
                            ))}
                          </div>
                        </div>
                        {comment && <p className="text-sm text-brand-ink/65 leading-relaxed">{comment}</p>}
                      </div>
                    );
                  })
                )}
              </div>

              {canReviewBooking && (
                <ReviewForm
                  eventId={event.id}
                  isRTL={isRTL}
                  existingReview={
                    myReview
                      ? { rating: myReview.rating, comment: (isRTL ? myReview.comment_ar : myReview.comment_en) ?? "" }
                      : null
                  }
                />
              )}
            </div>

          </div>

          {/* Right — Ticket selector (sticky) */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              {event.ticket_url && (!event.ticket_types || event.ticket_types.length === 0) ? (
                <div className="bg-white rounded-2xl border border-black/5 p-5 space-y-3">
                  <p className="text-sm text-brand-ink/60">
                    {isRTL ? "التذاكر متاحة عبر موقع المنظم" : "Tickets are sold on the organizer's site"}
                  </p>
                  <a
                    href={event.ticket_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-brand-midnight text-white text-sm font-medium hover:bg-brand-midnight/90 transition-colors"
                  >
                    {t("venues.getTickets")} <ExternalLink size={14} />
                  </a>
                  {event.source_url && (
                    <p className="text-[11px] text-brand-ink/40">
                      {t("venues.source")}:{" "}
                      <a href={event.source_url} target="_blank" rel="noopener noreferrer" className="underline hover:text-brand-gold">
                        {new URL(event.source_url).hostname}
                      </a>
                    </p>
                  )}
                </div>
              ) : (
              <TicketSelector
                eventId={event.id}
                ticketTypes={event.ticket_types ?? []}
                isFree={event.is_free ?? false}
                locale={locale}
              />
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
