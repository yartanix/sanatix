import { createClient } from "@/lib/supabase/server";
import { getLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import { Link } from "@/i18n/routing";
import { Calendar, Ticket, Wallet, Star, TrendingUp, Plus, Store, MapPin } from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/utils";

interface BookingRow {
  id: string;
  status: string;
  total_amount: number;
  currency: string;
  events: {
    id: string;
    title_ar: string;
    title_en: string;
    starts_at: string;
    venue_city: string | null;
    cover_image: string | null;
  } | null;
}

interface TrendingEvent {
  id: string;
  title_ar: string;
  title_en: string;
  venue_city: string | null;
  cover_image: string | null;
  starts_at: string;
  is_free: boolean;
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const locale = await getLocale();
  const isRTL = locale === "ar";

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login?next=/${locale}/dashboard`);

  const [{ data: profile }, { data: bookingsData }, { count: reviewCount }, { data: trendingData }] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", user.id).single(),
    supabase
      .from("bookings")
      .select("id, status, total_amount, currency, events(id, title_ar, title_en, starts_at, venue_city, cover_image)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase.from("reviews").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    supabase
      .from("events")
      .select("id, title_ar, title_en, venue_city, cover_image, starts_at, is_free")
      .eq("status", "published")
      .order("is_featured", { ascending: false })
      .order("view_count", { ascending: false })
      .limit(4),
  ]);

  const bookings = (bookingsData ?? []) as unknown as BookingRow[];
  const trending = (trendingData ?? []) as TrendingEvent[];
  const now = new Date();

  const upcomingBookings = bookings
    .filter((b) => b.events && b.status !== "cancelled" && new Date(b.events.starts_at) > now)
    .sort((a, b) => new Date(a.events!.starts_at).getTime() - new Date(b.events!.starts_at).getTime());

  const totalSpent = bookings
    .filter((b) => b.status === "confirmed")
    .reduce((sum, b) => sum + Number(b.total_amount), 0);
  const spendCurrency = bookings.find((b) => b.status === "confirmed")?.currency ?? "SAR";

  const stats = [
    { label_ar: "حجوزاتي", label_en: "My Bookings", value: String(bookings.length), icon: Ticket, color: "text-brand-gold" },
    { label_ar: "فعاليات قادمة", label_en: "Upcoming", value: String(upcomingBookings.length), icon: Calendar, color: "text-blue-500" },
    { label_ar: "إجمالي الإنفاق", label_en: "Total Spent", value: totalSpent === 0 ? "—" : formatCurrency(totalSpent, spendCurrency, isRTL ? "ar-SA" : "en-US"), icon: Wallet, color: "text-purple-500" },
    { label_ar: "تقييماتي", label_en: "Reviews", value: String(reviewCount ?? 0), icon: Star, color: "text-green-500" },
  ];

  const quickActions = [
    { label_ar: "استكشف الفعاليات", label_en: "Browse Events", href: "/events" as const, icon: Calendar, primary: false },
    { label_ar: "ابحث عن موردين", label_en: "Find Vendors", href: "/vendors" as const, icon: Store, primary: false },
    { label_ar: "لوحة المنظم", label_en: "Organizer Hub", href: "/organizer" as const, icon: Plus, primary: true },
  ];

  return (
    <div className="min-h-screen bg-brand-warm-white">
      <Navbar />

      <div className="max-w-6xl mx-auto px-6 py-10">

        {/* Welcome */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-medium text-brand-midnight mb-1">
              {isRTL ? `مرحبًا${profile?.full_name ? "، " + profile.full_name : ""} 👋` : `Welcome back${profile?.full_name ? ", " + profile.full_name : ""} 👋`}
            </h1>
            <p className="text-sm text-brand-ink/50">
              {isRTL ? "إليك ما يحدث في سناتيكس" : "Here's what's happening on Sanatix"}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((stat) => (
            <div key={stat.label_en} className="bg-white rounded-2xl border border-black/5 p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-brand-ink/50">{isRTL ? stat.label_ar : stat.label_en}</span>
                <stat.icon size={16} className={stat.color} />
              </div>
              <p className="text-2xl font-medium text-brand-midnight">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <div className="flex flex-wrap gap-3 mb-10">
          {quickActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-colors ${
                action.primary
                  ? "bg-brand-gold text-white hover:bg-brand-gold/90"
                  : "bg-white border border-black/10 text-brand-ink/70 hover:bg-brand-sand"
              }`}
            >
              <action.icon size={14} />
              {isRTL ? action.label_ar : action.label_en}
            </Link>
          ))}
        </div>

        {/* Two column layout */}
        <div className="grid lg:grid-cols-3 gap-6">

          {/* Upcoming bookings */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-black/5 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-medium text-brand-midnight">{isRTL ? "حجوزات قادمة" : "Upcoming Bookings"}</h2>
              <Link href="/bookings" className="text-xs text-brand-gold hover:underline">
                {isRTL ? "عرض الكل" : "View all"}
              </Link>
            </div>

            {upcomingBookings.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="w-14 h-14 rounded-2xl bg-brand-sand flex items-center justify-center mb-4">
                  <Ticket size={22} className="text-brand-ink/30" />
                </div>
                <p className="text-sm text-brand-ink/50 mb-3">
                  {isRTL ? "لا توجد حجوزات قادمة بعد" : "No upcoming bookings yet"}
                </p>
                <Link href="/events" className="text-sm text-brand-gold hover:underline font-medium">
                  {isRTL ? "استكشف الفعاليات ←" : "Browse events →"}
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingBookings.slice(0, 4).map((b) => {
                  const ev = b.events!;
                  const title = isRTL ? ev.title_ar : ev.title_en;
                  return (
                    <Link
                      key={b.id}
                      href={`/bookings/${b.id}/confirm`}
                      className="flex items-center gap-3 p-2 -mx-2 rounded-xl hover:bg-brand-sand/40 transition-colors"
                    >
                      <div className="w-12 h-12 rounded-xl bg-brand-sand shrink-0 overflow-hidden">
                        {ev.cover_image && <img src={ev.cover_image} alt={title} className="w-full h-full object-cover" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-brand-midnight truncate">{title}</p>
                        <div className="flex items-center gap-2 text-xs text-brand-ink/40 mt-0.5">
                          <span className="flex items-center gap-1"><Calendar size={10} />{formatDate(ev.starts_at, isRTL ? "ar-SA" : "en-US")}</span>
                          {ev.venue_city && <span className="flex items-center gap-1"><MapPin size={10} />{ev.venue_city}</span>}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Trending events */}
          <div className="bg-white rounded-2xl border border-black/5 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-medium text-brand-midnight">{isRTL ? "الأكثر رواجًا" : "Trending"}</h2>
              <TrendingUp size={15} className="text-brand-gold" />
            </div>

            {trending.length === 0 ? (
              <p className="text-xs text-brand-ink/40 text-center py-6">
                {isRTL ? "لا توجد فعاليات حاليًا" : "No events right now"}
              </p>
            ) : (
              <div className="space-y-3">
                {trending.map((ev) => {
                  const title = isRTL ? ev.title_ar : ev.title_en;
                  return (
                    <Link key={ev.id} href={`/events/${ev.id}`} className="flex gap-3 hover:opacity-80 transition-opacity">
                      <div className="w-12 h-12 rounded-xl bg-brand-sand shrink-0 overflow-hidden">
                        {ev.cover_image && <img src={ev.cover_image} alt={title} className="w-full h-full object-cover" />}
                      </div>
                      <div className="flex-1 min-w-0 py-0.5">
                        <p className="text-xs font-medium text-brand-midnight truncate">{title}</p>
                        <p className="text-[11px] text-brand-ink/40 mt-1">
                          {ev.venue_city ?? ""} {ev.is_free ? (isRTL ? "· مجاني" : "· Free") : ""}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
