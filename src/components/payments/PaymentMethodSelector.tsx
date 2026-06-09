"use client";

import { useLocale } from "next-intl";
import { cn } from "@/lib/utils";
import type { PaymentGateway, PaymentMethodOption } from "@/types/payments";

const PAYMENT_OPTIONS: PaymentMethodOption[] = [
  {
    id: "hyperpay",
    nameEn: "HyperPay",
    nameAr: "هايبر باي",
    descriptionEn: "Credit & debit cards — Visa, Mastercard, Mada",
    descriptionAr: "بطاقات الائتمان والخصم — فيزا، ماستركارد، مدى",
    icon: "💳",
    supportedCurrencies: ["SAR", "AED", "KWD", "QAR"],
    isBNPL: false,
    isAvailable: true,
  },
  {
    id: "tabby",
    nameEn: "Tabby",
    nameAr: "تابي",
    descriptionEn: "Buy now, pay later in 4 installments — interest free",
    descriptionAr: "اشتر الآن وادفع لاحقاً على 4 أقساط — بدون فوائد",
    icon: "🔄",
    supportedCurrencies: ["SAR", "AED"],
    isBNPL: true,
    isAvailable: true,
  },
  {
    id: "stripe",
    nameEn: "Stripe",
    nameAr: "سترايب",
    descriptionEn: "International cards — Visa, Mastercard, Amex",
    descriptionAr: "البطاقات الدولية — فيزا، ماستركارد، أمريكان إكسبريس",
    icon: "🌐",
    supportedCurrencies: ["SAR", "AED", "USD"],
    isBNPL: false,
    isAvailable: true,
  },
];

interface PaymentMethodSelectorProps {
  selected: PaymentGateway | null;
  onSelect: (gateway: PaymentGateway) => void;
  currency?: string;
  className?: string;
}

export default function PaymentMethodSelector({
  selected,
  onSelect,
  currency = "SAR",
  className,
}: PaymentMethodSelectorProps) {
  const locale = useLocale();
  const isRTL = locale === "ar";

  const availableOptions = PAYMENT_OPTIONS.filter(
    (opt) =>
      opt.isAvailable &&
      opt.supportedCurrencies.includes(currency as "SAR" | "AED" | "KWD" | "QAR" | "USD")
  );

  return (
    <div className={cn("space-y-3", className)}>
      <p className="text-sm font-medium text-brand-midnight">
        {isRTL ? "طريقة الدفع" : "Payment method"}
      </p>

      {availableOptions.map((option) => {
        const isSelected = selected === option.id;
        const name = isRTL ? option.nameAr : option.nameEn;
        const description = isRTL ? option.descriptionAr : option.descriptionEn;

        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onSelect(option.id)}
            className={cn(
              "w-full flex items-center gap-4 p-4 rounded-xl border-2 text-start transition-all",
              isSelected
                ? "border-brand-gold bg-brand-gold/5"
                : "border-black/8 bg-white hover:border-brand-gold/40 hover:bg-brand-sand/30"
            )}
          >
            {/* Icon */}
            <div
              className={cn(
                "w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0",
                isSelected ? "bg-brand-gold/15" : "bg-brand-sand"
              )}
            >
              {option.icon}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-sm font-medium text-brand-midnight">
                  {name}
                </span>
                {option.isBNPL && (
                  <span className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full font-medium">
                    {isRTL ? "تقسيط" : "BNPL"}
                  </span>
                )}
              </div>
              <p className="text-xs text-brand-ink/50 leading-relaxed">
                {description}
              </p>
            </div>

            {/* Radio indicator */}
            <div
              className={cn(
                "w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors",
                isSelected
                  ? "border-brand-gold bg-brand-gold"
                  : "border-black/20"
              )}
            >
              {isSelected && (
                <div className="w-2 h-2 rounded-full bg-white" />
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
