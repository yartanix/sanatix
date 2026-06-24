"use client";

import { useLocale } from "next-intl";
import { CheckCircle, XCircle, Clock, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PaymentStatus as TPaymentStatus } from "@/types/payments";

interface PaymentStatusProps {
  status: TPaymentStatus | "loading";
  message?: string;
  onRetry?: () => void;
  className?: string;
}

const STATUS_CONFIG = {
  loading: {
    icon: null,
    bgColor: "bg-brand-sand",
    iconColor: "text-brand-ink/40",
    titleEn: "Processing payment...",
    titleAr: "جاري معالجة الدفع...",
    subtitleEn: "Please wait, do not close this page",
    subtitleAr: "يرجى الانتظار، لا تغلق هذه الصفحة",
  },
  pending: {
    icon: Clock,
    bgColor: "bg-amber-50",
    iconColor: "text-amber-500",
    titleEn: "Payment pending",
    titleAr: "الدفع قيد الانتظار",
    subtitleEn: "Your payment is being processed",
    subtitleAr: "جاري معالجة دفعتك",
  },
  processing: {
    icon: Clock,
    bgColor: "bg-blue-50",
    iconColor: "text-blue-500",
    titleEn: "Payment processing",
    titleAr: "جاري معالجة الدفع",
    subtitleEn: "Your payment is being verified",
    subtitleAr: "جاري التحقق من دفعتك",
  },
  completed: {
    icon: CheckCircle,
    bgColor: "bg-emerald-50",
    iconColor: "text-emerald-500",
    titleEn: "Payment successful!",
    titleAr: "تم الدفع بنجاح!",
    subtitleEn: "Your booking has been confirmed",
    subtitleAr: "تم تأكيد حجزك",
  },
  failed: {
    icon: XCircle,
    bgColor: "bg-red-50",
    iconColor: "text-red-500",
    titleEn: "Payment failed",
    titleAr: "فشل الدفع",
    subtitleEn: "Your payment could not be processed",
    subtitleAr: "تعذر معالجة دفعتك",
  },
  refunded: {
    icon: RefreshCw,
    bgColor: "bg-gray-50",
    iconColor: "text-gray-500",
    titleEn: "Payment refunded",
    titleAr: "تم استرداد الدفعة",
    subtitleEn: "Your refund has been processed",
    subtitleAr: "تمت معالجة استردادك",
  },
  cancelled: {
    icon: XCircle,
    bgColor: "bg-gray-50",
    iconColor: "text-gray-400",
    titleEn: "Payment cancelled",
    titleAr: "تم إلغاء الدفع",
    subtitleEn: "Your payment was cancelled",
    subtitleAr: "تم إلغاء دفعتك",
  },
};

export default function PaymentStatus({
  status,
  message,
  onRetry,
  className,
}: PaymentStatusProps) {
  const locale = useLocale();
  const isRTL = locale === "ar";
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  return (
    <div className={cn("text-center py-8", className)}>
      {/* Icon */}
      <div
        className={cn(
          "w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5",
          config.bgColor
        )}
      >
        {status === "loading" ? (
          <div className="w-8 h-8 border-3 border-brand-gold/30 border-t-brand-gold rounded-full animate-spin" />
        ) : Icon ? (
          <Icon size={36} className={config.iconColor} />
        ) : null}
      </div>

      {/* Title */}
      <h2 className="text-xl font-medium text-brand-midnight mb-2">
        {isRTL ? config.titleAr : config.titleEn}
      </h2>

      {/* Subtitle or custom message */}
      <p className="text-sm text-brand-ink/55 mb-6">
        {message || (isRTL ? config.subtitleAr : config.subtitleEn)}
      </p>

      {/* Retry button for failed/cancelled */}
      {(status === "failed" || status === "cancelled") && onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-6 py-3 bg-brand-midnight text-white rounded-xl text-sm font-medium hover:bg-brand-ink transition-colors"
        >
          <RefreshCw size={14} />
          {isRTL ? "حاول مرة أخرى" : "Try again"}
        </button>
      )}
    </div>
  );
}
