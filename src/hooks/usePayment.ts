"use client";

import { useState, useCallback } from "react";
import type { PaymentGateway, PaymentStatus, SupportedCurrency } from "@/types/payments";

interface InitializePaymentOptions {
  bookingId: string;
  paymentMethod: PaymentGateway;
}

interface PaymentState {
  isLoading: boolean;
  error: string | null;
  status: PaymentStatus | null;
  sessionId: string | null;
  transactionId: string | null;
  paymentUrl: string | null;
}

export function usePayment() {
  const [state, setState] = useState<PaymentState>({
    isLoading: false,
    error: null,
    status: null,
    sessionId: null,
    transactionId: null,
    paymentUrl: null,
  });

  const initializePayment = useCallback(
    async ({ bookingId, paymentMethod }: InitializePaymentOptions) => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const response = await fetch("/api/payments/initialize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ booking_id: bookingId, payment_method: paymentMethod }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          setState((prev) => ({
            ...prev,
            isLoading: false,
            error: data.error || "Payment initialization failed",
          }));
          return null;
        }

        setState((prev) => ({
          ...prev,
          isLoading: false,
          sessionId: data.session_id,
          transactionId: data.transaction_id,
          paymentUrl: data.payment_url,
          status: "pending",
        }));

        return data;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unexpected error";
        setState((prev) => ({ ...prev, isLoading: false, error: message }));
        return null;
      }
    },
    []
  );

  const verifyPayment = useCallback(
    async ({
      sessionId,
      transactionId,
      provider,
    }: {
      sessionId: string;
      transactionId?: string;
      provider: PaymentGateway;
    }) => {
      setState((prev) => ({ ...prev, isLoading: true, error: null, status: "processing" }));

      try {
        const response = await fetch("/api/payments/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session_id: sessionId, transaction_id: transactionId, provider }),
        });

        const data = await response.json();

        setState((prev) => ({
          ...prev,
          isLoading: false,
          status: data.payment_status || "failed",
          error: data.error || null,
        }));

        return data;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Verification failed";
        setState((prev) => ({ ...prev, isLoading: false, error: message, status: "failed" }));
        return null;
      }
    },
    []
  );

  const requestRefund = useCallback(
    async ({
      transactionId,
      reason,
      amount,
    }: {
      transactionId: string;
      reason: string;
      amount?: number;
    }) => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const response = await fetch("/api/payments/refund", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transaction_id: transactionId, reason, amount }),
        });

        const data = await response.json();

        setState((prev) => ({
          ...prev,
          isLoading: false,
          status: data.success ? "refunded" : prev.status,
          error: data.error || null,
        }));

        return data;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Refund failed";
        setState((prev) => ({ ...prev, isLoading: false, error: message }));
        return null;
      }
    },
    []
  );

  const reset = useCallback(() => {
    setState({
      isLoading: false,
      error: null,
      status: null,
      sessionId: null,
      transactionId: null,
      paymentUrl: null,
    });
  }, []);

  return {
    ...state,
    initializePayment,
    verifyPayment,
    requestRefund,
    reset,
  };
}
