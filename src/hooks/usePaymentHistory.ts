"use client";

import { useState, useEffect, useCallback } from "react";
import type { PaymentTransaction, PaymentStatus, PaymentGateway } from "@/types/payments";

interface TransactionWithBooking extends PaymentTransaction {
  bookings?: {
    id: string;
    quantity: number;
    events?: { title_ar: string; title_en: string; starts_at: string; venue_city: string };
    ticket_types?: { name_ar: string; name_en: string };
  };
}

interface UsePaymentHistoryOptions {
  status?: PaymentStatus;
  provider?: PaymentGateway;
  startDate?: string;
  endDate?: string;
  limit?: number;
}

export function usePaymentHistory(options: UsePaymentHistoryOptions = {}) {
  const [transactions, setTransactions] = useState<TransactionWithBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const { status, provider, startDate, endDate, limit = 10 } = options;

  const fetchHistory = useCallback(async (currentPage: number = 1) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(currentPage), limit: String(limit) });
      if (status) params.set("status", status);
      if (provider) params.set("provider", provider);
      if (startDate) params.set("start_date", startDate);
      if (endDate) params.set("end_date", endDate);

      const res = await fetch(`/api/payments/history?${params}`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to fetch history");

      setTransactions(data.transactions);
      setTotalPages(data.pages);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load payment history");
    } finally {
      setLoading(false);
    }
  }, [status, provider, startDate, endDate, limit]);

  useEffect(() => {
    fetchHistory(page);
  }, [fetchHistory, page]);

  const goToPage = useCallback((newPage: number) => {
    setPage(Math.max(1, Math.min(totalPages, newPage)));
  }, [totalPages]);

  const refresh = useCallback(() => {
    fetchHistory(page);
  }, [fetchHistory, page]);

  return {
    transactions,
    loading,
    error,
    page,
    totalPages,
    total,
    goToPage,
    refresh,
  };
}
