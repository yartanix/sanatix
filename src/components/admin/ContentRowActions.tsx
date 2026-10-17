"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EyeOff } from "lucide-react";

export default function ContentRowActions({
  kind,
  id,
  isRTL,
}: {
  kind: "event" | "venue";
  id: string;
  isRTL: boolean;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function unpublish() {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/admin/${kind}s/${id}`, { method: "PATCH" });
    const result = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(result.error ?? (isRTL ? "حدث خطأ" : "Something went wrong"));
      return;
    }
    setDone(true);
    router.refresh();
  }

  if (done) {
    return <span className="text-xs text-white/30">{isRTL ? "تم السحب" : "Unpublished"}</span>;
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2 justify-end flex-wrap">
        {error && <span className="text-xs text-red-400">{error}</span>}
        <button
          onClick={unpublish}
          disabled={loading}
          className="text-xs px-2.5 py-1.5 rounded-lg bg-red-500 text-white disabled:opacity-50"
        >
          {loading ? "…" : isRTL ? "تأكيد السحب" : "Confirm"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          disabled={loading}
          className="text-xs px-2.5 py-1.5 rounded-lg border border-white/15 text-white/60"
        >
          {isRTL ? "إلغاء" : "Cancel"}
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-white/15 text-white/60 hover:border-red-400/50 hover:text-red-400 transition-colors"
    >
      <EyeOff size={13} />
      {isRTL ? "سحب" : "Unpublish"}
    </button>
  );
}
