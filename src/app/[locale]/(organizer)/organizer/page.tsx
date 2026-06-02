import { createClient } from "@/lib/supabase/server";
import { getLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { Link } from "@/i18n/routing";

export const metadata = { title: "Organizer Hub - Sanatix" };

export default async function OrganizerDashboard() {
  const supabase = await createClient();
  const locale = await getLocale();
  const isRTL = locale === "ar";
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/" + locale + "/login");

  const { data: events } = await supabase
    .from("events")
    .select("id, title_ar, title_en, status, starts_at, venue_city")
    .eq("organizer_id", user.id)
    .order("created_at", { ascending: false });

  const total = events ? events.length : 0;
  let published = 0;
  let drafts = 0;
  if (events) {
    for (const e of events) {
      if (e.status === "published") published++;
      if (e.status === "draft") drafts++;
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-brand-midnight">
            {isRTL ? "\u0644\u0648\u062d\u0629 \u0627\u0644\u062a\u062d\u0643\u0645" : "Organizer Hub"}
          </h1>
          <p className="text-sm text-brand-ink/50 mt-1">
            {isRTL ? "\u0645\u0631\u062d\u0628\u064b\u0627 \u0628\u0643 \u0641\u064a \u0644\u0648\u062d\u0629 \u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u0641\u0639\u0627\u0644\u064a\u0627\u062a" : "Welcome to your event management dashboard"}
          </p>
        </div>
        <Link
          href="/organizer/events/new"
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-gold text-white text-sm font-medium rounded-xl hover:bg-brand-gold/90 transition-colors"
        >
          {isRTL ? "\u0641\u0639\u0627\u0644\u064a\u0629 \u062c\u062f\u064a\u062f\u0629" : "+ New Event"}
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-black/5 p-5">
          <p className="text-2xl font-semibold text-brand-midnight">{total}</p>
          <p className="text-xs text-brand-ink/50 mt-1">{isRTL ? "\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u0641\u0639\u0627\u0644\u064a\u0627\u062a" : "Total Events"}</p>
        </div>
        <div className="bg-white rounded-2xl border border-black/5 p-5">
          <p className="text-2xl font-semibold text-emerald-600">{published}</p>
          <p className="text-xs text-brand-ink/50 mt-1">{isRTL ? "\u0645\u0646\u0634\u0648\u0631\u0629" : "Published"}</p>
        </div>
        <div className="bg-white rounded-2xl border border-black/5 p-5">
          <p className="text-2xl font-semibold text-amber-600">{drafts}</p>
          <p className="text-xs text-brand-ink/50 mt-1">{isRTL ? "\u0645\u0633\u0648\u062f\u0627\u062a" : "Drafts"}</p>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-medium text-brand-midnight mb-4">
          {isRTL ? "\u0641\u0639\u0627\u0644\u064a\u0627\u062a\u0643" : "Your Events"}
        </h2>

        {total === 0 ? (
          <div className="bg-white rounded-2xl border border-black/5 p-12 text-center">
            <p className="text-brand-ink/60 text-sm mb-4">
              {isRTL ? "\u0644\u0645 \u062a\u0646\u0634\u0626 \u0623\u064a \u0641\u0639\u0627\u0644\u064a\u0627\u062a \u0628\u0639\u062f" : "You haven't created any events yet"}
            </p>
            <Link
              href="/organizer/events/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-brand-midnight text-white text-sm rounded-xl"
            >
              {isRTL ? "\u0623\u0646\u0634\u0626 \u0641\u0639\u0627\u0644\u064a\u062a\u0643 \u0627\u0644\u0623\u0648\u0644\u0649" : "Create your first event"}
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-black/5 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/5 text-brand-ink/50">
                  <th className="text-start px-5 py-3 font-medium">{isRTL ? "\u0627\u0644\u0641\u0639\u0627\u0644\u064a\u0629" : "Event"}</th>
                  <th className="text-start px-5 py-3 font-medium hidden md:table-cell">{isRTL ? "\u0627\u0644\u0645\u062f\u064a\u0646\u0629" : "City"}</th>
                  <th className="text-start px-5 py-3 font-medium">{isRTL ? "\u0627\u0644\u062d\u0627\u0644\u0629" : "Status"}</th>
                </tr>
              </thead>
              <tbody>
                {events && events.slice(0, 5).map(function(event) {
                  return (
                    <tr key={event.id} className="border-b border-black/5 last:border-0">
                      <td className="px-5 py-3.5">
                        <Link href={"/organizer/events/" + event.id + "/edit"} className="font-medium text-brand-midnight hover:text-brand-gold">
                          {isRTL ? event.title_ar : event.title_en}
                        </Link>
                      </td>
                      <td className="px-5 py-3.5 text-brand-ink/60 hidden md:table-cell">{event.venue_city || "\u2014"}</td>
                      <td className="px-5 py-3.5">
                        <span className={event.status === "published" ? "text-xs px-2.5 py-1 rounded-full font-medium bg-emerald-500/10 text-emerald-600" : "text-xs px-2.5 py-1 rounded-full font-medium bg-amber-500/10 text-amber-600"}>
                          {event.status === "published" ? (isRTL ? "\u0645\u0646\u0634\u0648\u0631" : "Published") : (isRTL ? "\u0645\u0633\u0648\u062f\u0629" : "Draft")}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Link href="/organizer/events" className="bg-white rounded-2xl border border-black/5 p-5 hover:border-brand-gold/30 transition-colors">
          <p className="font-medium text-brand-midnight">{isRTL ? "\u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u0641\u0639\u0627\u0644\u064a\u0627\u062a" : "Manage Events"}</p>
          <p className="text-xs text-brand-ink/50 mt-1">{isRTL ? "\u0639\u0631\u0636 \u0648\u062a\u0639\u062f\u064a\u0644 \u062c\u0645\u064a\u0639 \u0641\u0639\u0627\u0644\u064a\u0627\u062a\u0643" : "View and edit all your events"}</p>
        </Link>
        <Link href="/organizer/settings" className="bg-white rounded-2xl border border-black/5 p-5 hover:border-brand-gold/30 transition-colors">
          <p className="font-medium text-brand-midnight">{isRTL ? "\u0627\u0644\u0625\u0639\u062f\u0627\u062f\u0627\u062a" : "Settings"}</p>
          <p className="text-xs text-brand-ink/50 mt-1">{isRTL ? "\u062a\u062d\u062f\u064a\u062b \u0645\u0644\u0641\u0643 \u0627\u0644\u0634\u062e\u0635\u064a" : "Update your profile and preferences"}</p>
        </Link>
      </div>
    </div>
  );
}
