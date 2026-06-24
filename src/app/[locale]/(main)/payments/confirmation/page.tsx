import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { getLocale } from "next-intl/server";
import { CheckCircle, Calendar, MapPin, Download, Share2, Ticket } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import { Link } from "@/i18n/routing";
import { formatDateTime, formatCurrency } from "@/lib/utils";

interface ConfirmationPageProps {
  searchParams: Promise<{
    booking_id?: string;
    session_id?: string;
    transaction_id?: string;
  }>;
}

export default async function PaymentConfirmationPage({
  searchParams,
}: ConfirmationPageProps) {
  const { booking_id } = await searchParams;
  const locale = await getLocale();
  const supabase = await createClient();
  const isRTL = locale === "ar";
  const displayLocale = isRTL ? "ar-SA" : "en-US";

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  if (!booking_id) notFound();

  const { data: booking } = await supabase
    .from("bookings")
    .select(`
      *,
      ticket_types(name_ar, name_en, price, currency),
      events(title_ar, title_en, starts_at, venue_name, venue_city, cover_image)
    `)
    .eq("id", booking_id)
    .eq("user_id", user.id)
    .single();

  if (!booking) notFound();

  // Fetch the latest transaction for this booking
  const { data: transaction } = await supabase
    .from("payment_transactions")
    .select("*")
    .eq("booking_id", booking_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  const eventTitle = isRTL ? booking.events.title_ar : booking.events.title_en;
  const ticketName = isRTL ? booking.ticket_types.name_ar : booking.ticket_types.name_en;

  const providerLabels: Record<string, string> = {
    hyperpay: "HyperPay",
    tabby: "Tabby",
    stripe: "Stripe",
  };

  return (
    <div className="min-h-screen bg-brand-warm-white">
      <Navbar />

      <div className="max-w-lg mx-auto px-6 py-12">

        {/* Success header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-5">
            <CheckCircle size={38} className="text-emerald-500" />
          </div>
          <h1 className="text-2xl font-medium text-brand-midnight mb-2">
            {isRTL ? "تم الدفع بنجاح!" : "Payment successful!"}
          </h1>
          <p className="text-sm text-brand-ink/55">
            {isRTL
              ? "تم تأكيد حجزك وسيتم إرسال التفاصيل إلى بريدك الإلكتروني"
              : "Your booking is confirmed. Details will be sent to your email."}
          </p>
        </div>

        {/* Ticket card */}
        <div className="bg-white rounded-2xl border border-black/5 overflow-hidden mb-5">

          {/* Event cover */}
          {booking.events.cover_image && (
            <div className="h-36 overflow-hidden">
              <img
                src={booking.events.cover_image}
                alt={eventTitle}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="p-5">
            <h2 className="font-medium text-brand-midnight text-base mb-4 leading-snug">
              {eventTitle}
            </h2>

            <div className="space-y-2.5 mb-5">
              <div className="flex items-center gap-2.5 text-sm text-brand-ink/55">
                <Calendar size={14} className="text-brand-gold shrink-0" />
                <span>{formatDateTime(booking.events.starts_at, displayLocale)}</span>
              </div>
              <div className="flex items-center gap-2.5 text-sm text-brand-ink/55">
                <MapPin size={14} className="text-brand-gold shrink-0" />
                <span>
                  {booking.events.venue_name
                    ? `${booking.events.venue_name}, `
                    : ""}
                  {booking.events.venue_city}
                </span>
              </div>
              <div className="flex items-center gap-2.5 text-sm text-brand-ink/55">
                <Ticket size={14} className="text-brand-gold shrink-0" />
                <span>{ticketName} × {booking.quantity}</span>
              </div>
            </div>

            {/* Payment summary */}
            <div className="space-y-2 border-t border-black/5 pt-4">
              <div className="flex justify-between text-sm">
                <span className="text-brand-ink/45">
                  {isRTL ? "المبلغ المدفوع" : "Amount paid"}
                </span>
                <span className="font-semibold text-brand-gold">
                  {booking.total_amount === 0
                    ? (isRTL ? "مجاني" : "Free")
                    : formatCurrency(booking.total_amount, booking.currency, displayLocale)}
                </span>
              </div>
              {transaction && (
                <div className="flex justify-between text-sm">
                  <span className="text-brand-ink/45">
                    {isRTL ? "طريقة الدفع" : "Payment method"}
                  </span>
                  <span className="text-brand-midnight">
                    {providerLabels[transaction.provider] || transaction.provider}
                  </span>
                </div>
              )}
            </div>

            {/* QR Code */}
            {booking.qr_code && (
              <div className="mt-5 pt-4 border-t border-black/5 text-center">
                <div className="w-28 h-28 bg-brand-sand rounded-xl mx-auto flex items-center justify-center mb-2.5">
                  <div className="text-xs text-brand-ink/30 font-mono text-center leading-tight">
                    QR<br />CODE
                  </div>
                </div>
                <p className="text-xs text-brand-ink/35 font-mono">{booking.qr_code}</p>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mb-5">
          <button className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-black/10 bg-white text-sm text-brand-ink/65 hover:bg-brand-sand transition-colors">
            <Download size={14} />
            {isRTL ? "تحميل التذكرة" : "Download ticket"}
          </button>
          <button className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-black/10 bg-white text-sm text-brand-ink/65 hover:bg-brand-sand transition-colors">
            <Share2 size={14} />
            {isRTL ? "مشاركة" : "Share"}
          </button>
        </div>

        <div className="flex flex-col gap-3 text-center">
          <Link
            href="/bookings"
            className="text-sm text-brand-gold hover:underline"
          >
            {isRTL ? "← عرض جميع حجوزاتي" : "← View all my bookings"}
          </Link>
          <Link
            href="/events"
            className="text-sm text-brand-ink/45 hover:text-brand-midnight transition-colors"
          >
            {isRTL ? "استكشف المزيد من الفعاليات" : "Explore more events"}
          </Link>
        </div>
      </div>
    </div>
  );
}
