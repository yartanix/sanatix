import { createClient } from "@/lib/supabase/server";
import { getLocale } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { ExternalLink } from "lucide-react";

export const metadata = { title: "Referral analytics - Sanatix" };

interface ClickRow {
  event_id: string | null;
  target_url: string;
  created_at: string;
}

export default async function AdminReferralsPage() {
  const supabase = await createClient();
  const locale = await getLocale();
  const isRTL = locale === "ar";

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data: clickRows } = await supabase
    .from("outbound_clicks")
    .select("event_id, target_url, created_at")
    .eq("kind", "event_ticket")
    .gte("created_at", thirtyDaysAgo)
    .order("created_at", { ascending: false })
    .limit(2000);

  const rows = (clickRows ?? []) as ClickRow[];

  const byEvent = new Map<string, { count: number; targetUrl: string }>();
  for (const row of rows) {
    if (!row.event_id) continue;
    const existing = byEvent.get(row.event_id);
    byEvent.set(row.event_id, { count: (existing?.count ?? 0) + 1, targetUrl: row.target_url });
  }

  const eventIds = Array.from(byEvent.keys());
  let titles = new Map<string, string>();
  if (eventIds.length > 0) {
    const { data: events } = await supabase
      .from("events")
      .select("id, title_ar, title_en")
      .in("id", eventIds);
    titles = new Map(
      (events ?? []).map((e) => [e.id, isRTL ? e.title_ar : e.title_en])
    );
  }

  const ranked = Array.from(byEvent.entries())
    .map(([eventId, info]) => ({ eventId, ...info, title: titles.get(eventId) ?? eventId }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 50);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">
          {isRTL ? "تحليلات الإحالة" : "Referral analytics"}
        </h1>
        <p className="text-sm text-white/40 mt-1">
          {isRTL
            ? "عدد مرات ضغط الزوار على زر \"الحصول على التذاكر\" الذي يوجههم لموقع خارجي، آخر 30 يومًا. هذه هي البيانات التي ستحتاجها لعرض شراكة إحالة على بائعي التذاكر."
            : "How many times visitors clicked \"Get tickets\" to an external seller, last 30 days. This is the data to bring to a ticket seller when pitching a referral/affiliate deal."}
        </p>
      </div>

      {ranked.length === 0 ? (
        <div className="bg-[#141414] rounded-2xl border border-white/8 p-8 text-center">
          <p className="text-sm text-white/40">
            {isRTL ? "لا توجد نقرات مسجّلة بعد" : "No outbound clicks recorded yet"}
          </p>
        </div>
      ) : (
        <div className="bg-[#141414] rounded-2xl border border-white/8 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/8 text-white/40 text-xs">
                <th className="text-start px-5 py-3 font-medium">{isRTL ? "الفعالية" : "Event"}</th>
                <th className="text-start px-5 py-3 font-medium">{isRTL ? "الوجهة" : "Destination"}</th>
                <th className="text-end px-5 py-3 font-medium">{isRTL ? "النقرات" : "Clicks"}</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((r) => (
                <tr key={r.eventId} className="border-b border-white/5 last:border-0">
                  <td className="px-5 py-3 text-white/80">
                    <Link href={`/events/${r.eventId}`} className="hover:text-amber-400 transition-colors">
                      {r.title}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-white/40 max-w-xs truncate">
                    <a href={r.targetUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-amber-400 transition-colors">
                      <span className="truncate">{new URL(r.targetUrl).hostname}</span>
                      <ExternalLink size={11} className="shrink-0" />
                    </a>
                  </td>
                  <td className="px-5 py-3 text-end text-white font-semibold">{r.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
