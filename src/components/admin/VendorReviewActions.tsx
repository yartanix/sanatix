"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";

export default function VendorReviewActions({ vendorId, isRTL }: { vendorId: string; isRTL: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState<"verify" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmingReject, setConfirmingReject] = useState(false);

  async function verify() {
    setLoading("verify");
    setError(null);
    const res = await fetch(`/api/admin/vendors/${vendorId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_verified: true }),
    });
    const result = await res.json().catch(() => ({}));
    setLoading(null);
    if (!res.ok) {
      setError(result.error ?? (isRTL ? "حدث خطأ" : "Something went wrong"));
      return;
    }
    router.refresh();
  }

  async function reject() {
    setLoading("reject");
    setError(null);
    const res = await fetch(`/api/admin/vendors/${vendorId}`, { method: "DELETE" });
    const result = await res.json().catch(() => ({}));
    setLoading(null);
    if (!res.ok) {
      setError(result.error ?? (isRTL ? "حدث خطأ" : "Something went wrong"));
      return;
    }
    router.refresh();
  }

  if (confirmingReject) {
    return (
      <div className="flex items-center gap-2 justify-end flex-wrap">
        {error && <span className="text-xs text-red-400">{error}</span>}
        <button
          onClick={reject}
          disabled={loading !== null}
          className="text-xs px-2.5 py-1.5 rounded-lg bg-red-500 text-white disabled:opacity-50"
        >
          {loading === "reject" ? "…" : isRTL ? "تأكيد الرفض" : "Confirm reject"}
        </button>
        <button
          onClick={() => setConfirmingReject(false)}
          disabled={loading !== null}
          className="text-xs px-2.5 py-1.5 rounded-lg border border-white/15 text-white/60"
        >
          {isRTL ? "إلغاء" : "Cancel"}
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 justify-end flex-wrap">
      {error && <span className="text-xs text-red-400">{error}</span>}
      <button
        onClick={verify}
        disabled={loading !== null}
        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-emerald-500 text-white disabled:opacity-50 hover:bg-emerald-600 transition-colors"
      >
        <Check size={13} />
        {loading === "verify" ? "…" : isRTL ? "موافقة" : "Approve"}
      </button>
      <button
        onClick={() => setConfirmingReject(true)}
        disabled={loading !== null}
        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-white/15 text-white/60 hover:border-red-400/50 hover:text-red-400 transition-colors"
      >
        <X size={13} />
        {isRTL ? "رفض" : "Reject"}
      </button>
    </div>
  );
}
