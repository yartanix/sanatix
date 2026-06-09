"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { ArrowLeft, Calendar, MapPin, Ticket } from "lucide-react";
import { formatDate } from "@/lib/utils";
import PaymentForm from "./PaymentForm";
import PaymentStatus from "./PaymentStatus";
import type { PaymentGateway, SupportedCurrency } from "@/types/payments";

interface BookingDetails {
  id: string;
  total_amount: number;
  currency: SupportedCurrency;
  quantity: number;
  events: {
    title_ar: string;
    title_en: string;
    starts_at: string;
    venue_name: string | null;
    venue_city: string;
  };
  ticket_types: {
    name_ar: string;
    name_en: string;
  };
}

interface PaymentCheckoutProps {
  booking: BookingDetails;
}

type CheckoutStep = "form" | "processing" | "success" | "error";

export default function PaymentCheckout({ booking }: PaymentCheckoutProps) {
  const locale = useLocale();
  const router = useRouter();
  const isRTL = locale === "ar";
  const displayLocale = isRTL ? "ar-SA" : "en-US";

  const [step, setStep] = useState<CheckoutStep>("form");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const eventTitle = isRTL ? booking.events.title_ar : booking.events.title_en;
  const ticketName = isRTL ? booking.ticket_types.name_ar : booking.ticket_types.name_en;

  async function handlePayment(gateway: PaymentGateway) {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/payments/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          booking_id: booking.id,
          payment_method: gateway,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.error || (isRTL ? "فشل تهيئة الدفع" : "Payment initialization failed"));
        setIsLoading(false);
        return;
      }

      // In production: redirect to payment gateway URL
      // For now, simulate processing and redirect to confirmation
      setStep("processing");

      // Simulate payment processing delay
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Verify payment
      const verifyResponse = await fetch("/api/payments/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: data.session_id,
          transaction_id: data.transaction_id,
          provider: gateway,
        }),
      });

      const verifyData = await verifyResponse.json();

      if (verifyData.payment_status === "completed") {
        setStep("success");
        setTimeout(() => {
          router.push(`/bookings/${booking.id}/confirm`);
        }, 2000);
      } else {
        setStep("error");
        setError(verifyData.error || (isRTL ? "فشل التحقق من الدفع" : "Payment verification failed"));
      }
    } catch {
      setStep("error");
      setError(isRTL ? "حدث خطأ غير متوقع" : "An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  }

  function handleRetry() {
    setStep("form");
    setError(null);
  }

  return (
    <div className="max-w-lg mx-auto px-6 py-10">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 rounded-xl border border-black/8 flex items-center justify-center text-brand-ink/60 hover:bg-brand-sand transition-colors"
        >
          <ArrowLeft size={16} />
        </button>
        <h1 className="text-xl font-medium text-brand-midnight">
          {isRTL ? "إتمام الدفع" : "Checkout"}
        </h1>
      </div>

      {/* Event summary card */}
      <div className="bg-white rounded-2xl border border-black/5 p-5 mb-6">
        <h2 className="font-medium text-brand-midnight text-sm mb-3 line-clamp-2">
          {eventTitle}
        </h2>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-brand-ink/50">
            <Calendar size={12} className="text-brand-gold shrink-0" />
            <span>{formatDate(booking.events.starts_at, displayLocale)}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-brand-ink/50">
            <MapPin size={12} className="text-brand-gold shrink-0" />
            <span>
              {booking.events.venue_name
                ? `${booking.events.venue_name}, `
                : ""}
              {booking.events.venue_city}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-brand-ink/50">
            <Ticket size={12} className="text-brand-gold shrink-0" />
            <span>
              {ticketName} × {booking.quantity}
            </span>
          </div>
        </div>
      </div>

      {/* Step content */}
      {step === "form" && (
        <PaymentForm
          bookingId={booking.id}
          amount={booking.total_amount}
          currency={booking.currency}
          eventTitle={eventTitle}
          ticketName={ticketName}
          quantity={booking.quantity}
          onSubmit={handlePayment}
          isLoading={isLoading}
          error={error}
        />
      )}

      {step === "processing" && (
        <div className="bg-white rounded-2xl border border-black/5 p-6">
          <PaymentStatus status="processing" />
        </div>
      )}

      {step === "success" && (
        <div className="bg-white rounded-2xl border border-black/5 p-6">
          <PaymentStatus
            status="completed"
            message={
              isRTL
                ? "سيتم تحويلك إلى صفحة التأكيد..."
                : "Redirecting to confirmation..."
            }
          />
        </div>
      )}

      {step === "error" && (
        <div className="bg-white rounded-2xl border border-black/5 p-6">
          <PaymentStatus
            status="failed"
            message={error || undefined}
            onRetry={handleRetry}
          />
        </div>
      )}
    </div>
  );
}
