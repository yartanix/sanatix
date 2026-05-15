import { createClient } from "@/lib/supabase/server";
import { getLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { Link } from "@/i18n/routing";
import { Calendar, Plus, Settings, Users, BarChart3 } from "lucide-react";

export const metadata = { title: "Organizer Hub — Sanatix" };

export default async function OrganizerDashboard() {
  const supabase = await createClient();
  const locale = await getLocale();
  const isRTL = locale === "ar";
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect(`/${locale}/login`);

  const { data: events } = await supabase
    .from("events")
    .select("id, title_ar, title_en, status, starts_at, venue_city, view_count")
    .eq("organizer_id", user.id)
    .order("created_at", { ascending: false });

  const totalEvents = events?.length ?? 0;
  const published = events?.filter((e) => e.status === "published").length ?? 0;
  const drafts = events?.filter((e) => e.status === "draft").length ?? 0;
  let totalViews = 0;
  if (events) {
    for (const e of events) {
      totalViews += e.view_count ?? 0;
    }
  }

  const kpis = [
    { label: isRTL ? "إجمالي الفعاليات" : "Total Events", value: totalEvents, icon: Calendar },
    { label: isRTL ? "منشورة" : "Published", value: published, icon: BarChart3 },
    { label: isRTL ? "مسودات" : "Drafts", value: drafts, icon: Settings },
    { label: isRTL ? "المشاهدات" : "Total Views", value: totalViews, icon: Users },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-brand-midnight">
            {isRTL ? "لوحة التحكم" : "Organizer Hub"}
          </h1>
          <p className="text-sm text-brand-ink/50 mt-1">
            {isRTL ? "مرحبًا بك في لوحة إدارة الفعاليات" : "Welcome to your event management dashboard"}
          </p>
        </div>
        <Link
          href="/organizer/events/new"
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-gold text-white text-sm font-medium rounded-xl hover:bg-brand-gold/90 transition-colors"
        >
          <Plus size={16} />
          {isRTL ? "فعالية جديدة" : "New Event"}
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => (
          <div key={i} className="bg-white rounded-2xl border border-black/5 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-xl bg-brand-gold/10 flex items-center justify-center">
                <kpi.icon size={16} className="text-brand-gold" />
              </div>
            </div>
            <p className="text-2xl font-semibold text-brand-midnight">{kpi.value}</p>
            <p className="text-xs text-brand-ink/50 mt-1">{kpi.label}</p>
          </div>
        ))}
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-brand-midnight">
            {isRTL ? "فعالياتك" : "Your Events"}
          </h2>
          <Link
            href="/organizer/events"
            className="text-sm text-brand-gold hover:underline"
          >
            {isRTL ? "عرض الكل" : "View all"}
          </Link>
        </div>

        {totalEvents === 0 ? (
          <div className="bg-white rounded-2xl border border-black/5 p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-brand-sand flex items-center justify-center mx-auto mb-4">
              <Calendar size={24} className="text-brand-ink/30" />
            </div>
            <p className="text-brand-ink/60 text-sm mb-4">
              {isRTL ? "لم تنشئ أي فعاليات بعد" : "You haven't created any events yet"}
            </p>
            <Link
              href="/organizer/events/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-brand-midnight text-white text-sm rounded-xl hover:bg-brand-midnight/90 transition-colors"
            >
              <Plus size={14} />
              {isRTL ? "أنشئ فعاليتك الأولى" : "Create your first event"}
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-black/5 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/5 text-brand-ink/50">
                  <th className="text-start px-5 py-3 font-medium">{isRTL ? "الفعالية" : "Event"}</th>
                  <th className="text-start px-5 py-3 font-medium hidden md:table-cell">{isRTL ? "المدينة" : "City"}</th>
                  <th className="text-start px-5 py-3 font-medium hidden md:table-cell">{isRTL ? "التاريخ" : "Date"}</th>
                  <th className="text-start px-5 py-3 font-medium">{isRTL ? "الحالة" : "Status"}</th>
                </tr>
              </thead>
              <tbody>
                {events?.slice(0, 5).map((event) => (
                  <tr key={event.id} className="border-b border-black/5 last:border-0 hover:bg-brand-sand/30 transition-colors">
                    <td className="px-5 py-3.5">
                      <Link href={`/organizer/events/${event.id}/edit`} className="font-medium text-brand-midnight hover:text-brand-gold transition-colors">
                        {isRTL ? event.title_ar : event.title_en}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 text-brand-ink/60 hidden md:table-cell">{event.venue_city ?? "— }</td>
                    <td className="px-5 py-3.5 text-brand-ink/60 hidden md:table-cell">
                      {event.starts_at ? new Date(event.starts_at).toLocaleDateString(isRTL ? "ar-SA" : "en-US", { month: "short", day: "numeric" }) : "—"}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                        event.status === "published"
                          ? "bg-emerald-500/10 text-emerald-600"
                          : event.status === "draft"
                          ? "bg-amber-500/10 text-amber-600"
                          : "bg-red-500/10 text-red-500"
                      }`}>
                        {event.status === "published" ? (isRTL ? "منشور" : "Published") :
                         event.status === "draft" ? (isRTL ? "مسودة" : "Draft") :
                         event.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Link href="/organizer/events" className="bg-white rounded-2xl border border-black/5 p-5 hover:border-brand-gold/30 transition-colors group">
          <Calendar size={20} className="text-brand-gold mb-3" />
          <p className="font-medium text-brand-midnight group-hover:text-brand-gold transition-colors">
            {isRTL ? "إدارة الفعاليات" : "Manage Events"}
          </p>
          <p className="text-xs text-brand-ink/50 mt-1">
            {isRTL ? "عرض وتعديل جميع فعالياتك" : "View and edit all your events"}
          </p>
        </Link>
        <Link href="/organizer/settings" className="bg-white rounded-2xl border border-black/5 p-5 hover:border-brand-gold/30 transition-colors group">
          <Settings size={20} className="text-brand-gold mb-3" />
          <p className="font-medium text-brand-midnight group-hover:text-brand-gold transition-colors">
            {isRTL ? "الإعدادات" : "Settings"}
          </p>
          <p className="text-xs text-brand-ink/50 mt-1">
            {isRTL ? "تحديث ملفك الشخصي وتفضيلاتك" : "Update your profile and preferences"}
          </p>
        </Link>
      </div>
    </div>
  );
}
