import { createClient } from "@/lib/supabase/server";
import { getLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { Link } from "@/i18n/routing";
import { CalendarDays, MapPin } from "lucide-react";
import { formatDate } from "@/lib/utils";
import EventRowActions from "@/components/organizer/EventRowActions";

const STATUS_TABS = ["all", "draft", "published", "cancelled", "completed"] as const;

const STATUS_LABEL: Record<string, { ar: string; en: string }> = {
  all:       { ar: "الكل",     en: "All" },
  draft:     { ar: "مسودة",    en: "Draft" },
  published: { ar: "منشورة",   en: "Published" },
  cancelled: { ar: "ملغاة",    en: "Cancelled" },
  completed: { ar: "منتهية",   en: "Completed" },
};

const STATUS_BADGE: Record<string, string> = {
  draft:     "bg-amber-500/10 text-amber-600",
  published: "bg-emerald-500/10 text-emerald-600",
  cancelled: "bg-red-500/10 text-red-500",
  completed: "bg-black/5 text-brand-ink/50",
};

interface PageProps {
  searchParams: Promise<{ status?: string }>;
}

export default async function EventsListPage({ searchParams }: PageProps) {
  const { status } = await searchParams;
  const activeStatus = status && STATUS_TABS.includes(status as (typeof STATUS_TABS)[number]) ? status : "all";

  const supabase = await createClient();
  const locale = await getLocale();
  const isRTL = locale === "ar";

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  let query = supabase
    .from("events")
    .select("id, title_ar, title_en, status, starts_at, venue_city, ticket_types(sold_quantity, total_quantity)")
    .eq("organizer_id", user.id)
    .order("created_at", { ascending: false });

  if (activeStatus !== "all") query = query.eq("status", activeStatus);

  const { data: events } = await query;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-brand-midnight">
          {isRTL ? "فعالياتي" : "Your Events"}
        </h1>
        <Link
          href="/organizer/events/new"
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-gold text-white text-sm font-medium rounded-xl hover:bg-brand-gold/90 transition-colors"
        >
          {isRTL ? "+ فعالية جديدة" : "+ New Event"}
        </Link>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        {STATUS_TABS.map((s) => (
          <Link
            key={s}
            href={s === "all" ? "/organizer/events" : `/organizer/events?status=${s}`}
            className={
              "text-xs px-3 py-1.5 rounded-full font-medium transition-colors " +
              (activeStatus === s
                ? "bg-brand-midnight text-white"
                : "bg-white border border-black/5 text-brand-ink/60 hover:bg-brand-sand")
            }
          >
            {isRTL ? STATUS_LABEL[s].ar : STATUS_LABEL[s].en}
          </Link>
        ))}
      </div>

      {!events || events.length === 0 ? (
        <div className="bg-white rounded-2xl border border-black/5 p-12 text-center">
          <p className="text-brand-ink/60 text-sm mb-4">
            {isRTL ? "لا توجد فعاليات في هذا التصنيف" : "No events in this filter"}
          </p>
          <Link
            href="/organizer/events/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-midnight text-white text-sm rounded-xl"
          >
            {isRTL ? "أنشئ فعالية" : "Create an event"}
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-black/5 divide-y divide-black/5">
          {events.map((event) => {
            const sold = event.ticket_types?.reduce((sum, tt) => sum + tt.sold_quantity, 0) ?? 0;
            const total = event.ticket_types?.reduce((sum, tt) => sum + tt.total_quantity, 0) ?? 0;
            return (
              <div key={event.id} className="flex items-center gap-4 px-5 py-4">
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/organizer/events/${event.id}/edit`}
                    className="font-medium text-brand-midnight hover:text-brand-gold text-sm"
                  >
                    {isRTL ? event.title_ar : event.title_en}
                  </Link>
                  <div className="flex items-center gap-3 text-xs text-brand-ink/40 mt-1.5">
                    <span className="flex items-center gap-1">
                      <CalendarDays size={11} />
                      {formatDate(event.starts_at, isRTL ? "ar-SA" : "en-US")}
                    </span>
                    {event.venue_city && (
                      <span className="flex items-center gap-1">
                        <MapPin size={11} />
                        {event.venue_city}
                      </span>
                    )}
                    {total > 0 && (
                      <span>
                        {sold}/{total} {isRTL ? "تذكرة مباعة" : "sold"}
                      </span>
                    )}
                  </div>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium shrink-0 ${STATUS_BADGE[event.status] ?? "bg-black/5 text-brand-ink/50"}`}>
                  {isRTL ? STATUS_LABEL[event.status]?.ar ?? event.status : STATUS_LABEL[event.status]?.en ?? event.status}
                </span>
                <Link
                  href={`/organizer/events/${event.id}/attendees`}
                  className="text-xs text-brand-ink/50 hover:text-brand-gold shrink-0"
                >
                  {isRTL ? "الحضور" : "Attendees"}
                </Link>
                <EventRowActions eventId={event.id} isRTL={isRTL} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
