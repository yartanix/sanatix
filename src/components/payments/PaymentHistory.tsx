"use client";

import { useState, useEffect, useCallback } from "react";
import { useLocale } from "next-intl";
import { Receipt, ChevronDown, RefreshCw, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatPaymentCurrency, formatTransactionDate } from "@/lib/payments/utils";
import type { PaymentTransaction, PaymentStatus, SupportedCurrency } from "@/types/payments";

interface TransactionWithBooking extends PaymentTransaction {
  bookings?: {
    id: string;
    quantity: number;
    events?: { title_ar: string; title_en: string; starts_at: string; venue_city: string };
    ticket_types?: { name_ar: string; name_en: string };
  };
}

const STATUS_LABELS: Record<string, { ar: string; en: string; color: string }> = {
  pending:    { ar: "معلق",      en: "Pending",    color: "bg-amber-50 text-amber-600" },
  processing: { ar: "قيد المعالجة", en: "Processing", color: "bg-blue-50 text-blue-600" },
  completed:  { ar: "مكتمل",     en: "Completed",  color: "bg-emerald-50 text-emerald-600" },
  failed:     { ar: "فاشل",      en: "Failed",     color: "bg-red-50 text-red-500" },
  refunded:   { ar: "مسترد",     en: "Refunded",   color: "bg-gray-50 text-gray-500" },
  cancelled:  { ar: "ملغي",      en: "Cancelled",  color: "bg-gray-50 text-gray-400" },
};

const PROVIDER_LABELS: Record<string, string> = {
  hyperpay: "HyperPay",
  tabby: "Tabby",
  stripe: "Stripe",
};

export default function PaymentHistory() {
  const locale = useLocale();
  const isRTL = locale === "ar";
  const displayLocale = isRTL ? "ar-SA" : "en-US";

  const [transactions, setTransactions] = useState<TransactionWithBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | "">("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "10" });
      if (statusFilter) params.set("status", statusFilter);

      const res = await fetch(`/api/payments/history?${params}`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to fetch");

      setTransactions(data.transactions);
      setTotalPages(data.pages);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load transactions");
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-2xl border border-black/5 p-5 animate-pulse">
            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-xl bg-brand-sand" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-brand-sand rounded w-3/4" />
                <div className="h-3 bg-brand-sand rounded w-1/2" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500 text-sm mb-4">{error}</p>
        <button
          onClick={fetchTransactions}
          className="text-sm text-brand-gold hover:underline flex items-center gap-1.5 mx-auto"
        >
          <RefreshCw size={13} />
          {isRTL ? "إعادة المحاولة" : "Retry"}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="flex items-center gap-3">
        <Filter size={15} className="text-brand-ink/40 shrink-0" />
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value as PaymentStatus | ""); setPage(1); }}
          className="text-sm border border-black/10 rounded-xl px-3 py-2 bg-white text-brand-midnight focus:outline-none focus:border-brand-gold"
        >
          <option value="">{isRTL ? "جميع الحالات" : "All statuses"}</option>
          {Object.entries(STATUS_LABELS).map(([key, val]) => (
            <option key={key} value={key}>{isRTL ? val.ar : val.en}</option>
          ))}
        </select>
      </div>

      {/* Empty state */}
      {transactions.length === 0 && (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-brand-sand flex items-center justify-center mx-auto mb-4">
            <Receipt size={24} className="text-brand-ink/30" />
          </div>
          <p className="text-brand-ink/50 text-sm">
            {isRTL ? "لا توجد معاملات بعد" : "No transactions yet"}
          </p>
        </div>
      )}

      {/* Transaction list */}
      <div className="space-y-3">
        {transactions.map((tx) => {
          const statusConfig = STATUS_LABELS[tx.status] || STATUS_LABELS.pending;
          const isExpanded = expandedId === tx.id;
          const eventTitle = tx.bookings?.events
            ? (isRTL ? tx.bookings.events.title_ar : tx.bookings.events.title_en)
            : (isRTL ? "فعالية" : "Event");

          return (
            <div
              key={tx.id}
              className="bg-white rounded-2xl border border-black/5 overflow-hidden"
            >
              <button
                className="w-full flex items-center gap-4 p-5 text-start hover:bg-brand-sand/20 transition-colors"
                onClick={() => setExpandedId(isExpanded ? null : tx.id)}
              >
                {/* Provider icon */}
                <div className="w-11 h-11 rounded-xl bg-brand-sand flex items-center justify-center text-lg shrink-0">
                  {tx.provider === "hyperpay" ? "💳" : tx.provider === "tabby" ? "🔄" : "🌐"}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-brand-midnight truncate">{eventTitle}</p>
                  <p className="text-xs text-brand-ink/45 mt-0.5">
                    {PROVIDER_LABELS[tx.provider] || tx.provider} •{" "}
                    {formatTransactionDate(tx.created_at, displayLocale)}
                  </p>
                </div>

                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <span className="text-sm font-semibold text-brand-midnight">
                    {formatPaymentCurrency(tx.amount, tx.currency as SupportedCurrency, displayLocale)}
                  </span>
                  <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium", statusConfig.color)}>
                    {isRTL ? statusConfig.ar : statusConfig.en}
                  </span>
                </div>

                <ChevronDown
                  size={15}
                  className={cn(
                    "text-brand-ink/30 transition-transform shrink-0",
                    isExpanded && "rotate-180"
                  )}
                />
              </button>

              {/* Expanded details */}
              {isExpanded && (
                <div className="px-5 pb-5 pt-0 border-t border-black/5 space-y-2.5">
                  <div className="flex justify-between text-xs pt-3">
                    <span className="text-brand-ink/45">{isRTL ? "رقم المعاملة" : "Transaction ID"}</span>
                    <span className="text-brand-midnight font-mono text-[11px]">{tx.id.slice(0, 16)}...</span>
                  </div>
                  {tx.provider_transaction_id && (
                    <div className="flex justify-between text-xs">
                      <span className="text-brand-ink/45">{isRTL ? "رقم مزود الدفع" : "Provider ref"}</span>
                      <span className="text-brand-midnight font-mono text-[11px]">{tx.provider_transaction_id.slice(0, 20)}...</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xs">
                    <span className="text-brand-ink/45">{isRTL ? "العملة" : "Currency"}</span>
                    <span className="text-brand-midnight">{tx.currency}</span>
                  </div>
                  {tx.refund_amount && (
                    <div className="flex justify-between text-xs">
                      <span className="text-brand-ink/45">{isRTL ? "مبلغ الاسترداد" : "Refund amount"}</span>
                      <span className="text-emerald-600">
                        {formatPaymentCurrency(tx.refund_amount, tx.currency as SupportedCurrency, displayLocale)}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="text-sm text-brand-ink/60 hover:text-brand-midnight disabled:opacity-30 transition-colors"
          >
            {isRTL ? "السابق" : "Previous"}
          </button>
          <span className="text-sm text-brand-ink/40">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="text-sm text-brand-ink/60 hover:text-brand-midnight disabled:opacity-30 transition-colors"
          >
            {isRTL ? "التالي" : "Next"}
          </button>
        </div>
      )}
    </div>
  );
}
