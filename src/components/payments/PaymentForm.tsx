"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import { Lock, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatPaymentCurrency, calculateCommission, calculateGrandTotal } from "@/lib/payments/utils";
import PaymentMethodSelector from "./PaymentMethodSelector";
import type { PaymentGateway, SupportedCurrency } from "@/types/payments";

interface PaymentFormProps {
  bookingId: string;
  amount: number;
  currency: SupportedCurrency;
  eventTitle: string;
  ticketName: string;
  quantity: number;
  onSubmit: (gateway: PaymentGateway) => Promise<void>;
  isLoading?: boolean;
  error?: string | null;
}

export default function PaymentForm({
  bookingId,
  amount,
  currency,
  eventTitle,
  ticketName,
  quantity,
  onSubmit,
  isLoading = false,
  error = null,
}: PaymentFormProps) {
  const locale = useLocale();
  const isRTL = locale === "ar";
  const displayLocale = isRTL ? "ar-SA" : "en-US";

  const [selectedGateway, setSelectedGateway] = useState<PaymentGateway | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const commission = calculateCommission(amount);
  const grandTotal = calculateGrandTotal(amount);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedGateway || !termsAccepted || isLoading) return;
    await onSubmit(selectedGateway);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Order summary */}
      <div className="bg-brand-sand/50 rounded-xl p-4 space-y-2.5">
        <p className="text-xs font-medium text-brand-ink/50 uppercase tracking-wide mb-3">
          {isRTL ? "ملخص الطلب" : "Order summary"}
        </p>

        <div className="flex justify-between text-sm">
          <span className="text-brand-ink/60 truncate max-w-[60%]">{eventTitle}</span>
          <span className="text-brand-midnight font-medium shrink-0">
            {ticketName} × {quantity}
          </span>
        </div>

        <div className="border-t border-black/8 pt-2.5 space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-brand-ink/50">
              {isRTL ? "المبلغ الأساسي" : "Subtotal"}
            </span>
            <span className="text-brand-midnight">
              {formatPaymentCurrency(amount, currency, displayLocale)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-brand-ink/50">
              {isRTL ? "رسوم الخدمة (5%)" : "Service fee (5%)"}
            </span>
            <span className="text-brand-midnight">
              {formatPaymentCurrency(commission, currency, displayLocale)}
            </span>
          </div>
          <div className="flex justify-between text-sm font-semibold pt-1 border-t border-black/8">
            <span className="text-brand-midnight">
              {isRTL ? "الإجمالي" : "Total"}
            </span>
            <span className="text-brand-gold text-base">
              {formatPaymentCurrency(grandTotal, currency, displayLocale)}
            </span>
          </div>
        </div>
      </div>

      {/* Payment method selection */}
      <PaymentMethodSelector
        selected={selectedGateway}
        onSelect={setSelectedGateway}
        currency={currency}
      />

      {/* Error message */}
      {error && (
        <div className="flex items-start gap-2.5 bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Terms & conditions */}
      <label className="flex items-start gap-3 cursor-pointer">
        <div className="relative mt-0.5">
          <input
            type="checkbox"
            checked={termsAccepted}
            onChange={(e) => setTermsAccepted(e.target.checked)}
            className="sr-only"
          />
          <div
            className={cn(
              "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
              termsAccepted
                ? "bg-brand-gold border-brand-gold"
                : "border-black/20 bg-white"
            )}
          >
            {termsAccepted && (
              <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                <path
                  d="M1 4L3.5 6.5L9 1"
                  stroke="white"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </div>
        </div>
        <span className="text-xs text-brand-ink/60 leading-relaxed">
          {isRTL
            ? "أوافق على شروط الاستخدام وسياسة الخصوصية وسياسة الاسترداد"
            : "I agree to the Terms of Service, Privacy Policy, and Refund Policy"}
        </span>
      </label>

      {/* Submit button */}
      <button
        type="submit"
        disabled={!selectedGateway || !termsAccepted || isLoading}
        className={cn(
          "w-full flex items-center justify-center gap-2.5 py-4 rounded-xl font-medium text-sm transition-all",
          selectedGateway && termsAccepted && !isLoading
            ? "bg-brand-midnight text-white hover:bg-brand-ink shadow-sm"
            : "bg-brand-midnight/30 text-white/60 cursor-not-allowed"
        )}
      >
        {isLoading ? (
          <>
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            {isRTL ? "جاري المعالجة..." : "Processing..."}
          </>
        ) : (
          <>
            <Lock size={15} />
            {isRTL ? "إتمام الدفع الآن" : "Complete payment"}
          </>
        )}
      </button>

      <p className="text-xs text-brand-ink/40 text-center flex items-center justify-center gap-1.5">
        <Lock size={10} />
        {isRTL
          ? "جميع المعاملات مشفرة وآمنة"
          : "All transactions are encrypted and secure"}
      </p>
    </form>
  );
}
