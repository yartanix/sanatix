import { createClient } from "@/lib/supabase/server";
import { getLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import {
  Users,
  CalendarDays,
  ShoppingBag,
  DollarSign,
  Store,
  Flag,
  Clock,
  TrendingUp,
} from "lucide-react";
import StatsCard from "@/components/admin/StatsCard";
import StatusBadge from "@/components/admin/StatusBadge";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { Link } from "@/i18n/routing";

export const metadata = { title: "Admin Dashboard — Sanatix" };

export default async function AdminDashboard() {
  const supabase = await createClient();
  const locale = await getLocale();
  const isRTL = locale === "ar";

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const [
    usersResult,
    activeUsersResult,
    eventsResult,
    pendingEventsResult,
    bookingsResult,
    revenueResult,
    vendorsResult,
    pendingVendorsResult,
    reportsResult,
    recentBookingsResult,
    topEventsResult,
  ] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("id", { count: "exact", head: true }).gte("updated_at", sevenDaysAgo.toISOString()),
    supabase.from("events").select("id", { count: "exact", head: true }),
    supabase.from("events").select("id", { count: "exact", head: true }).eq("event_status", "pending"),
    supabase.from("bookings").select("id", { count: "exact", head: true }),
    supabase.from("bookings").select("total_amount, currency").eq("status", "confirmed"),
    supabase.from("vendors").select("id", { count: "exact", head: true }),
    supabase.from("vendors").select("id", { count: "exact", head: true }).eq("admin_verified", false),
    supabase.from("content_reports").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase
      .from("bookings")
      .select("id, total_amount, currency, status, created_at, user_id, event_id, profiles!user_id(full_name), events!event_id(title_ar, title_en)")
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("events")
      .select("id, title_ar, title_en, view_count, venue_city, event_status")
      .order("view_count", { ascending: false })
      .limit(5),
  ]);

  const totalRevenue = revenueResult.data?.reduce((s, b) => s + (b.total_amount ?? 0), 0) ?? 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-[#2C2C2C]">
          {isRTL ? "لوحة التحكم" : "Dashboard"}
        </h1>
        <p className="text-sm text-[#2C2C2C]/50 mt-1">
          {isRTL ? "نظرة عامة على المنصة" : "Platform overview"}
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title={isRTL ? "إجمالي المستخدمين" : "Total Users"}
          value={(usersResult.count ?? 0).toLocaleString()}
          subtitle={isRTL ? `${activeUsersResult.count ?? 0} نشط هذا الأسبوع` : `${activeUsersResult.count ?? 0} active this week`}
          icon={Users}
          color="teal"
        />
        <StatsCard
          title={isRTL ? "الفعاليات" : "Events"}
          value={(eventsResult.count ?? 0).toLocaleString()}
          subtitle={isRTL ? `${pendingEventsResult.count ?? 0} بانتظار الموافقة` : `${pendingEventsResult.count ?? 0} pending approval`}
          icon={CalendarDays}
          color="gold"
        />
        <StatsCard
          title={isRTL ? "الحجوزات" : "Bookings"}
          value={(bookingsResult.count ?? 0).toLocaleString()}
          icon={ShoppingBag}
          color="blue"
        />
        <StatsCard
          title={isRTL ? "الإيرادات" : "Revenue"}
          value={formatCurrency(totalRevenue, "SAR", isRTL ? "ar-SA" : "en-US")}
          icon={DollarSign}
          color="green"
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title={isRTL ? "الموردون" : "Vendors"}
          value={(vendorsResult.count ?? 0).toLocaleString()}
          subtitle={isRTL ? `${pendingVendorsResult.count ?? 0} بانتظار التحقق` : `${pendingVendorsResult.count ?? 0} pending verification`}
          icon={Store}
          color="teal"
        />
        <StatsCard
          title={isRTL ? "البلاغات المعلقة" : "Pending Reports"}
          value={(reportsResult.count ?? 0).toLocaleString()}
          icon={Flag}
          color="red"
        />
      </div>

      {/* Quick actions */}
      {((pendingEventsResult.count ?? 0) > 0 || (pendingVendorsResult.count ?? 0) > 0 || (reportsResult.count ?? 0) > 0) && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Clock size={16} className="text-amber-600" />
            <h3 className="text-sm font-semibold text-amber-800">
              {isRTL ? "إجراءات مطلوبة" : "Action Required"}
            </h3>
          </div>
          <div className="flex flex-wrap gap-3">
            {(pendingEventsResult.count ?? 0) > 0 && (
              <Link
                href="/admin/events?event_status=pending"
                className="text-sm bg-white border border-amber-200 text-amber-700 px-4 py-2 rounded-xl hover:bg-amber-50 transition-colors font-medium"
              >
                {isRTL
                  ? `${pendingEventsResult.count} فعالية بانتظار الموافقة`
                  : `${pendingEventsResult.count} events pending approval`}
              </Link>
            )}
            {(pendingVendorsResult.count ?? 0) > 0 && (
              <Link
                href="/admin/vendors?verified=false"
                className="text-sm bg-white border border-amber-200 text-amber-700 px-4 py-2 rounded-xl hover:bg-amber-50 transition-colors font-medium"
              >
                {isRTL
                  ? `${pendingVendorsResult.count} مورد بانتظار التحقق`
                  : `${pendingVendorsResult.count} vendors pending verification`}
              </Link>
            )}
            {(reportsResult.count ?? 0) > 0 && (
              <Link
                href="/admin/reports?status=pending"
                className="text-sm bg-white border border-amber-200 text-amber-700 px-4 py-2 rounded-xl hover:bg-amber-50 transition-colors font-medium"
              >
                {isRTL
                  ? `${reportsResult.count} بلاغ بانتظار المراجعة`
                  : `${reportsResult.count} reports pending review`}
              </Link>
            )}
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent bookings */}
        <div className="bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-black/5 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#2C2C2C]">
              {isRTL ? "آخر الحجوزات" : "Recent Bookings"}
            </h2>
            <Link href="/admin/bookings" className="text-xs text-[#1B4D4D] hover:underline">
              {isRTL ? "عرض الكل" : "View all"}
            </Link>
          </div>
          <div className="divide-y divide-black/5">
            {recentBookingsResult.data?.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-[#2C2C2C]/40">
                {isRTL ? "لا توجد حجوزات" : "No bookings yet"}
              </p>
            ) : (
              recentBookingsResult.data?.map((b) => {
                const profile = b.profiles as { full_name?: string } | null;
                const event = b.events as { title_ar?: string; title_en?: string } | null;
                return (
                  <div key={b.id} className="px-5 py-3.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#2C2C2C] truncate">
                        {isRTL ? event?.title_ar : event?.title_en}
                      </p>
                      <p className="text-xs text-[#2C2C2C]/50 mt-0.5">
                        {profile?.full_name ?? "—"} · {formatDateTime(b.created_at, isRTL ? "ar-SA" : "en-US")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-semibold text-[#2C2C2C]">
                        {formatCurrency(b.total_amount, b.currency, isRTL ? "ar-SA" : "en-US")}
                      </span>
                      <StatusBadge status={b.status} locale={locale as "ar" | "en"} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Top events */}
        <div className="bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-black/5 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#2C2C2C]">
              {isRTL ? "أكثر الفعاليات مشاهدة" : "Top Events by Views"}
            </h2>
            <Link href="/admin/events" className="text-xs text-[#1B4D4D] hover:underline">
              {isRTL ? "عرض الكل" : "View all"}
            </Link>
          </div>
          <div className="divide-y divide-black/5">
            {topEventsResult.data?.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-[#2C2C2C]/40">
                {isRTL ? "لا توجد فعاليات" : "No events yet"}
              </p>
            ) : (
              topEventsResult.data?.map((e, i) => (
                <div key={e.id} className="px-5 py-3.5 flex items-center gap-4">
                  <span className="text-lg font-bold text-[#2C2C2C]/20 w-6 shrink-0">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#2C2C2C] truncate">
                      {isRTL ? e.title_ar : e.title_en}
                    </p>
                    <p className="text-xs text-[#2C2C2C]/50 mt-0.5">{e.venue_city}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <TrendingUp size={13} className="text-[#1B4D4D]" />
                    <span className="text-sm font-semibold text-[#2C2C2C]">
                      {(e.view_count ?? 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
