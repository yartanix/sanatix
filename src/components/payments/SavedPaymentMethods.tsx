"use client";

import { useState, useEffect, useCallback } from "react";
import { useLocale } from "next-intl";
import { Plus, Trash2, Star, CreditCard, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PaymentMethod } from "@/types/payments";

const PROVIDER_ICONS: Record<string, string> = {
  hyperpay: "💳",
  tabby: "🔄",
  stripe: "🌐",
  tamara: "🛍️",
  stc_pay: "📱",
};

const PROVIDER_LABELS: Record<string, string> = {
  hyperpay: "HyperPay",
  tabby: "Tabby",
  stripe: "Stripe",
  tamara: "Tamara",
  stc_pay: "STC Pay",
};

export default function SavedPaymentMethods() {
  const locale = useLocale();
  const isRTL = locale === "ar";

  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [settingDefaultId, setSettingDefaultId] = useState<string | null>(null);

  const fetchMethods = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/payments/methods");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch");
      setMethods(data.methods);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load payment methods");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMethods();
  }, [fetchMethods]);

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/payments/methods/${id}`, { method: "DELETE" });
      if (res.ok) {
        setMethods((prev) => prev.filter((m) => m.id !== id));
      }
    } finally {
      setDeletingId(null);
    }
  }

  async function handleSetDefault(id: string) {
    setSettingDefaultId(id);
    try {
      const res = await fetch(`/api/payments/methods/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_default: true }),
      });
      if (res.ok) {
        setMethods((prev) =>
          prev.map((m) => ({ ...m, is_default: m.id === id }))
        );
      }
    } finally {
      setSettingDefaultId(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="bg-white rounded-2xl border border-black/5 p-5 animate-pulse">
            <div className="flex gap-4">
              <div className="w-11 h-11 rounded-xl bg-brand-sand" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-brand-sand rounded w-1/2" />
                <div className="h-3 bg-brand-sand rounded w-1/3" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500 text-sm mb-3">{error}</p>
        <button
          onClick={fetchMethods}
          className="text-sm text-brand-gold hover:underline flex items-center gap-1.5 mx-auto"
        >
          <RefreshCw size={13} />
          {isRTL ? "إعادة المحاولة" : "Retry"}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-brand-midnight">
          {isRTL ? "طرق الدفع المحفوظة" : "Saved payment methods"}
        </p>
        <button className="flex items-center gap-1.5 text-xs text-brand-gold hover:text-brand-gold/80 transition-colors">
          <Plus size={13} />
          {isRTL ? "إضافة جديد" : "Add new"}
        </button>
      </div>

      {methods.length === 0 ? (
        <div className="text-center py-10 bg-white rounded-2xl border border-black/5">
          <div className="w-14 h-14 rounded-2xl bg-brand-sand flex items-center justify-center mx-auto mb-3">
            <CreditCard size={22} className="text-brand-ink/30" />
          </div>
          <p className="text-sm text-brand-ink/50">
            {isRTL ? "لا توجد طرق دفع محفوظة" : "No saved payment methods"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {methods.map((method) => (
            <div
              key={method.id}
              className={cn(
                "bg-white rounded-2xl border p-4 flex items-center gap-4 transition-colors",
                method.is_default ? "border-brand-gold/40" : "border-black/5"
              )}
            >
              {/* Icon */}
              <div className="w-11 h-11 rounded-xl bg-brand-sand flex items-center justify-center text-xl shrink-0">
                {PROVIDER_ICONS[method.type] || "💳"}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-brand-midnight">
                    {PROVIDER_LABELS[method.provider] || method.provider}
                  </span>
                  {method.is_default && (
                    <span className="text-[10px] bg-brand-gold/10 text-brand-gold px-2 py-0.5 rounded-full font-medium">
                      {isRTL ? "افتراضي" : "Default"}
                    </span>
                  )}
                </div>
                {method.last_four && (
                  <p className="text-xs text-brand-ink/45 mt-0.5">
                    •••• {method.last_four}
                    {method.expiry_month && method.expiry_year && (
                      <span className="ms-2">
                        {String(method.expiry_month).padStart(2, "0")}/{method.expiry_year}
                      </span>
                    )}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0">
                {!method.is_default && (
                  <button
                    onClick={() => handleSetDefault(method.id)}
                    disabled={settingDefaultId === method.id}
                    title={isRTL ? "تعيين كافتراضي" : "Set as default"}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-brand-ink/40 hover:text-brand-gold hover:bg-brand-gold/10 transition-colors disabled:opacity-40"
                  >
                    <Star size={14} />
                  </button>
                )}
                <button
                  onClick={() => handleDelete(method.id)}
                  disabled={deletingId === method.id}
                  title={isRTL ? "حذف" : "Delete"}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-brand-ink/40 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
                >
                  {deletingId === method.id ? (
                    <div className="w-3.5 h-3.5 border-2 border-red-300 border-t-red-500 rounded-full animate-spin" />
                  ) : (
                    <Trash2 size={14} />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
