"use client";

import { useState, useEffect, useCallback } from "react";
import type { PaymentMethod, PaymentMethodType } from "@/types/payments";

interface AddMethodOptions {
  type: PaymentMethodType;
  provider: string;
  token?: string;
  last_four?: string;
  expiry_month?: number;
  expiry_year?: number;
  is_default?: boolean;
}

export function usePaymentMethods() {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMethods = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/payments/methods");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch payment methods");
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

  const addMethod = useCallback(async (options: AddMethodOptions) => {
    try {
      const res = await fetch("/api/payments/methods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(options),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add payment method");
      setMethods((prev) => [data.method, ...prev]);
      return data.method as PaymentMethod;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to add method";
      setError(message);
      return null;
    }
  }, []);

  const deleteMethod = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/payments/methods/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete payment method");
      }
      setMethods((prev) => prev.filter((m) => m.id !== id));
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete method";
      setError(message);
      return false;
    }
  }, []);

  const setDefaultMethod = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/payments/methods/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_default: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update payment method");
      setMethods((prev) => prev.map((m) => ({ ...m, is_default: m.id === id })));
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to set default";
      setError(message);
      return false;
    }
  }, []);

  const defaultMethod = methods.find((m) => m.is_default) || methods[0] || null;

  return {
    methods,
    loading,
    error,
    defaultMethod,
    fetchMethods,
    addMethod,
    deleteMethod,
    setDefaultMethod,
  };
}
