import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { getLocale } from "next-intl/server";
import { CheckCircle, Calendar, MapPin, Download, Share2 } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import { Link } from "@/i18n/routing";
import { formatDateTime, formatCurrency } from "@/lib/utils";

interface ConfirmPageProps {
  params: Promise<{ locale: string; id: string }>;
}

export default async function BookingConfirmPage({ params }: ConfirmPageProps) {
  const { id } = await params;
  const locale = await getLocale();
  const supabase = await createClient();
  const isRTL = locale === "ar";

  const { data: booking } = await supabase
    .from("bookings")
    .select(`
      *,
      ticket_types(name_ar, name_en, price, currency),
      events(title_ar, title_en, starts_at, venue_name, venue_city, cover_image)
    `)
    .eq("id", id)
    .single();

  if (!booking) notFound();

  const eventTitle = locale === "ar" ? booking.events.title_ar : booking.events.title_en;
  const ticketName = locale === "ar" ? booking.ticket_types.name_ar : booking.ticket_types.name_en;

  return (
    <div className="min-h-screen bg-brand-warm-white">
      <Navbar />

      <div className="max-w-lg mx-auto px-6 py-12">

        {/* Success header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} className="text-green-500" />
          </div>
          <h1 className="text-2xl font-medium text-brand-midnight mb-2">
            {isRTL ? "تم الحجز بنجاح!" : "Booking confirmed!"}
          </h1>
          <p className="text-sm text-brand-ink/60">
            {isRTL
              ? "سيتم إرسال تفاصيل تذكرتك إلى بريدك الإلكتروني"
              : "Your ticket details will be sent to your email"}
          </p>
        </div>

        {/* Ticket card */}
        <div className="bg-white rounded-2xl border border-black/5 overflow-hidden mb-6">

          {/* Event cover */}
          {booking.events.cover_image && (
            <div className="h-32 overflow-hidden">
              <img
                src={booking.events.cover_image}
                alt={eventTitle}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="p-5">
            <h2 className="font-medium text-brand-midnight text-base mb-4">{eventTitle}</h2>

            <div className="space-y-2.5 mb-4">
              <div className="flex items-center gap-2.5 text-sm text-brand-ink/60">
                <Calendar size={14} className="text-brand-gold shrink-0" />
                <span>{formatDateTime(booking.events.starts_at, isRTL ? "ar-SA" : "en-US")}</span>
              </div>
              <div className="flex items-center gap-2.5 text-sm text-brand-ink/60">
                <MapPin size={14} className="text-brand-gold shrink-0" />
                <span>{booking.events.venue_name} {booking.events.venue_city}</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-brand-ink/50">{isRTL ? "نوع ةلتذكر٩" : "Ticket type"}</span>
                <span className="font-medium text-brand-midnight">{ticketName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-brand-ink/50">{isRTL ? "العدد" : "Quantity"}</span>
                <span className="font-medium text-brand-midnight">{booking.quantity}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-brand-ink/50">{isRTL ? "ةلمبلت الإجمالي" : "Total"}</span>
                <span className="font-medium text-brand-gold">
                  {booking.total_amount === 0
                    ? (isRTL ? "مجاني" : "Free")
                    : formatCurrency(booking.total_amount, booking.currency, isRTL ? "ar-SA" : "en-US")}
                </span>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-black/5 text-center">
              <div className="w-24 h-24 bg-brand-sand rounded-xl mx-auto flex items-center justify-center mb-2">
                <div className="text-xs text-brand-ink/30 font-mono text-center leading-tight">
                  QR<br/>CODE
                </div>
              </div>
              <p className="text-xs text-brand-ink/40 font-mono">{booking.qr_code}</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-black/10 bg-white text-sm text-brand-ink/70 hover:bg-brand-sand transition-colors">
            <Download size={15} />
            {isRTL ? "تحميل" : "Download"}
          </button>
          <button className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-black/10 bg-white text-sm text-brand-ink/70 hover:bg-brand-sand transition-colors">
            <Share2 size={15} />
            {isRTL ? "مساركة" : "Share"}
          </button>
        </div>

        <Link
          href="/events"
          className="block text-center text-sm text-brand-gold hover:underline mt-5"
        >
          {isRTL ? "← استكشف المزيد من الفعاليات" : "← Explore more events"}
        </Link>

      </div>
    </div>
  );
}
