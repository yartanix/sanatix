"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

export default function EventRowActions({ eventId, isRTL }: { eventId: string; isRTL: boolean }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/organizer/events/${eventId}`, { method: "DELETE" });
    const result = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(result.error ?? (isRTL ? "حدث خطأ" : "Something went wrong"));
      return;
    }
    setConfirming(false);
    router.refresh();
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2 justify-end">
        {error && <span className="text-xs text-red-500">{error}</span>}
        <button
          onClick={handleDelete}
          disabled={loading}
          className="text-xs px-2.5 py-1 rounded-lg bg-red-500 text-white disabled:opacity-50"
        >
          {loading ? (isRTL ? "..." : "...") : isRTL ? "تأكيد" : "Confirm"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          disabled={loading}
          className="text-xs px-2.5 py-1 rounded-lg border border-black/10 text-brand-ink/60"
        >
          {isRTL ? "إلغاء" : "Cancel"}
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      title={isRTL ? "حذف الفعالية (أو إلغاؤها إذا كانت هناك تذاكر مباعة)" : "Delete event (cancels instead if tickets already sold)"}
      className="ms-auto flex items-center justify-center w-7 h-7 rounded-lg text-brand-ink/40 hover:text-red-500 hover:bg-red-50 transition-colors"
    >
      <Trash2 size={14} />
    </button>
  );
}
