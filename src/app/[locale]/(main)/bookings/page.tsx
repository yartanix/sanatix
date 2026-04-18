import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { Calendar, MapPin, Ticket } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import { Link } from "@/i18n/routing";
import { formatDate, formatCurrency } from "@/lib/utils";

export default async function BookingsPage() {
  const locale = await getLocale();
  const supabase = await createClient();
  const isRTL = locale === "ar";

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const { data: bookings } = await supabase
    .from("bookings")
    .select(`
      *,
      ticket_types(name_ar, name_en, price, currency),
      events(id, title_ar, title_en, starts_at, venue_city, cover_image, status)
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const statusColors: Record<string, string> = {
    confirmed: "bg-green-50 text-green-600",
    pending:   "bg-amber-50 text-amber-600",
    cancelled: "bg-red-50 text-red-500",
    refunded:  "bg-gray-50 text-gray-500",
  };

  const statusLabels: Record<string, Record<string, string>> = {
    confirmed: { ar: "مؤكد",    en: "Confirmed" },
    pending:   { ar: "معلق",    en: "Pending" },
    cancelled: { ar: "ملغي",    en: "Cancelled" },
    refunded:  { ar: "مسترجع",  en: "Refunded" },
  };

  return (
    <div className="min-h-screen bg-brand-warm-white">
      <Navbar />
      <div className="max-w-3xl mx-auto px-6 py-10">

        <h1 className="text-2xl font-medium text-brand-midnight mb-8">
          {isRTL ? "حجوزاتي" : "My Bookings"}
        </h1>

        {!bookings || bookings.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-brand-sand flex items-center justify-center mx-auto mb-4">
              <Ticket size={24} className="text-brand-ink/30" />
            </div>
            <p className="text-brand-ink/50 mb-4">
              {isRTL ? "لا توجد حجوزات Ȩعد" : "No bookings yet"}
            </p>
            <Link href="/events" className="text-sm text-brand-gold hover:underline">
              {isRTL ? "استكشف الفضاليات" : "Browse events"}
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => {
              const eventTitle = locale === "ar" ? booking.events.title_ar : booking.events.title_en;
              const ticketName = locale === "ar" ? booking.ticket_types.name_ar : booking.ticket_types.name_en;

              return (
                <Link key={booking.id} href={`/bookings/${booking.id}/confirm`}>
                  <div className="bg-white rounded-2xl border border-black/5 p-5 flex gap-4 hover:shadow-md transition-shadow">
                    <div className="w-20 h-20 rounded-xl bg-brand-sand shrink-0 overflow-hidden">
                      {booking.events.cover_image && (
                        <img src={booking.events.cover_image} alt={eventTitle} className="w-full h-full object-cover" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <h3 className="font-medium text-brand-midnight text-sm line-clamp-1">{eventTitle}</h3>
                        <span className={`text-xs px-2.5 py-1 rounded-full shrink-0 ${statusColors[booking.status] ?? "bg-gray-50 text-gray-500"}`}>
                          {statusLabels[booking.status]?.[locale] ?? booking.status}
                        </span>
                      </div>
                      <p className="text-xs text-brand-ink/50 mb-2">{ticketName} × {booking.quantity}</p>
                      <div className="flex items-center gap-3 text-xs text-brand-ink/40">
                        <span className="flex items-center gap-1">
                          <Calendar size={10} />
                          {formatDate(booking.events.starts_at, isRTL ? "ar-SA" : "en-US")}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin size={10} />
                          {booking.events.venue_city}
                        </span>
                      </div>
                    </div>
                    <div className="text-end shrink-0">
                      <p className="text-sm font-medium text-brand-gold">
                        {booking.total_amount === 0
                          ? (isRTL ? "مجاني" : "Free")
                          : formatCurrency(booking.total_amount, booking.currency, isRTL ? "ar-SA" : "en-US")}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
