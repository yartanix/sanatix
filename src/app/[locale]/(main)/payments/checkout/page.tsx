import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { getLocale } from "next-intl/server";
import Navbar from "@/components/layout/Navbar";
import PaymentCheckout from "@/components/payments/PaymentCheckout";
import type { SupportedCurrency } from "@/types/payments";

interface CheckoutPageProps {
  searchParams: Promise<{ booking_id?: string; cancelled?: string }>;
}

export default async function CheckoutPage({ searchParams }: CheckoutPageProps) {
  const { booking_id, cancelled } = await searchParams;
  const locale = await getLocale();
  const supabase = await createClient();
  const isRTL = locale === "ar";

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  if (!booking_id) notFound();

  const { data: booking, error } = await supabase
    .from("bookings")
    .select(`
      id,
      total_amount,
      currency,
      quantity,
      status,
      events(title_ar, title_en, starts_at, venue_name, venue_city),
      ticket_types(name_ar, name_en)
    `)
    .eq("id", booking_id)
    .eq("user_id", user.id)
    .single();

  if (error || !booking) notFound();

  // If already confirmed, redirect to confirmation page
  if (booking.status === "confirmed") {
    redirect(`/${locale}/bookings/${booking_id}/confirm`);
  }

  return (
    <div className="min-h-screen bg-brand-warm-white">
      <Navbar />

      {cancelled && (
        <div className="max-w-lg mx-auto px-6 pt-6">
          <div className="bg-amber-50 text-amber-700 text-sm px-4 py-3 rounded-xl">
            {isRTL
              ? "تم إلغاء عملية الدفع. يمكنك المحاولة مرة أخرى."
              : "Payment was cancelled. You can try again below."}
          </div>
        </div>
      )}

      <PaymentCheckout
        booking={{
          id: booking.id,
          total_amount: booking.total_amount,
          currency: booking.currency as SupportedCurrency,
          quantity: booking.quantity,
          events: booking.events as {
            title_ar: string;
            title_en: string;
            starts_at: string;
            venue_name: string | null;
            venue_city: string;
          },
          ticket_types: booking.ticket_types as {
            name_ar: string;
            name_en: string;
          },
        }}
      />
    </div>
  );
}
