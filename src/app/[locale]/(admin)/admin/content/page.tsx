import { createClient } from "@/lib/supabase/server";
import { getLocale } from "next-intl/server";
import { MapPin, Calendar } from "lucide-react";
import ContentRowActions from "@/components/admin/ContentRowActions";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Agent Content - Sanatix Admin" };

interface EventRow {
  id: string;
  title_ar: string;
  title_en: string;
  venue_city: string;
  starts_at: string;
  source_url: string | null;
}

interface VenueRow {
  id: string;
  name_ar: string;
  name_en: string;
  city: string;
  venue_type: string;
  source_url: string | null;
}

export default async function AdminContentPage() {
  const supabase = await createClient();
  const locale = await getLocale();
  const isRTL = locale === "ar";

  const [{ data: eventRows }, { data: venueRows }] = await Promise.all([
    supabase
      .from("events")
      .select("id, title_ar, title_en, venue_city, starts_at, source_url")
      .eq("agent_generated", true)
      .eq("status", "published")
      .order("starts_at", { ascending: true })
      .limit(100),
    supabase
      .from("venues")
      .select("id, name_ar, name_en, city, venue_type, source_url")
      .eq("agent_generated", true)
      .eq("is_published", true)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);
  const events = (eventRows ?? []) as EventRow[];
  const venues = (venueRows ?? []) as VenueRow[];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-white">
          {isRTL ? "محتوى الوكيل" : "Agent Content"}
        </h1>
        <p className="text-sm text-white/40 mt-1">
          {isRTL
            ? "كل ما يجده الوكيل يُنشر تلقائيًا — استخدم \"سحب\" لإزالة أي عنصر خاطئ من الموقع."
            : "Everything the agent finds publishes automatically — use \"Unpublish\" to pull anything that's wrong."}
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-white/70 flex items-center gap-2">
          <Calendar size={14} /> {isRTL ? "الفعاليات" : "Events"} ({events.length})
        </h2>
        {events.length === 0 ? (
          <div className="bg-[#141414] rounded-2xl border border-white/8 p-8 text-center text-sm text-white/40">
            {isRTL ? "لا توجد فعاليات منشورة من الوكيل" : "No agent-published events"}
          </div>
        ) : (
          <div className="space-y-2">
            {events.map((event) => {
              const title = isRTL ? event.title_ar : event.title_en;
              return (
                <div key={event.id} className="bg-[#141414] rounded-2xl border border-white/8 p-4 flex items-center justify-between gap-4 flex-wrap">
                  <div className="min-w-0">
                    <p className="text-sm text-white font-medium truncate">{title}</p>
                    <div className="flex items-center gap-3 text-xs text-white/40 mt-1">
                      <span className="flex items-center gap-1"><MapPin size={10} /> {event.venue_city}</span>
                      <span>{formatDateTime(event.starts_at, isRTL ? "ar-SA" : "en-US")}</span>
                      {event.source_url && (
                        <a href={event.source_url} target="_blank" rel="noopener noreferrer" className="underline hover:text-amber-400">
                          {new URL(event.source_url).hostname}
                        </a>
                      )}
                    </div>
                  </div>
                  <ContentRowActions kind="event" id={event.id} isRTL={isRTL} />
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-white/70 flex items-center gap-2">
          <MapPin size={14} /> {isRTL ? "الأماكن" : "Venues"} ({venues.length})
        </h2>
        {venues.length === 0 ? (
          <div className="bg-[#141414] rounded-2xl border border-white/8 p-8 text-center text-sm text-white/40">
            {isRTL ? "لا توجد أماكن منشورة من الوكيل" : "No agent-published venues"}
          </div>
        ) : (
          <div className="space-y-2">
            {venues.map((venue) => {
              const name = isRTL ? venue.name_ar : venue.name_en;
              return (
                <div key={venue.id} className="bg-[#141414] rounded-2xl border border-white/8 p-4 flex items-center justify-between gap-4 flex-wrap">
                  <div className="min-w-0">
                    <p className="text-sm text-white font-medium truncate">{name}</p>
                    <div className="flex items-center gap-3 text-xs text-white/40 mt-1">
                      <span className="flex items-center gap-1"><MapPin size={10} /> {venue.city}</span>
                      <span className="capitalize">{venue.venue_type}</span>
                      {venue.source_url && (
                        <a href={venue.source_url} target="_blank" rel="noopener noreferrer" className="underline hover:text-amber-400">
                          {new URL(venue.source_url).hostname}
                        </a>
                      )}
                    </div>
                  </div>
                  <ContentRowActions kind="venue" id={venue.id} isRTL={isRTL} />
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
