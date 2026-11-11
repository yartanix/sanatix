"use client";

import { useState } from "react";
import type { Review } from "@/types";
import { formatDate } from "@/lib/utils";
import { Star, Send } from "lucide-react";

export default function VendorReviewsList({
  locale,
  initialReviews,
}: {
  locale: string;
  initialReviews: Review[];
}) {
  const isRTL = locale === "ar";
  const [reviews, setReviews] = useState(initialReviews);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [sending, setSending] = useState<string | null>(null);

  async function respond(id: string) {
    const text = (drafts[id] ?? "").trim();
    if (!text) return;
    setSending(id);
    try {
      const res = await fetch(`/api/vendor/reviews/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vendorResponse: text }),
      });
      if (res.ok) {
        const updated = await res.json();
        setReviews((prev) => prev.map((r) => (r.id === id ? updated : r)));
        setDrafts((d) => ({ ...d, [id]: "" }));
      }
    } finally {
      setSending(null);
    }
  }

  if (reviews.length === 0) {
    return (
      <div className="max-w-2xl bg-white rounded-2xl border border-black/5 p-10 text-center">
        <Star size={24} className="mx-auto text-brand-ink/25 mb-3" />
        <p className="text-sm text-brand-ink/50">{isRTL ? "لا توجد تقييمات بعد" : "No reviews yet"}</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-5">
      <h1 className="text-xl font-semibold text-brand-midnight">{isRTL ? "التقييمات" : "Reviews"}</h1>

      <div className="space-y-4">
        {reviews.map((rv) => {
          const comment = isRTL ? rv.comment_ar : rv.comment_en;
          return (
            <div key={rv.id} className="bg-white rounded-2xl border border-black/5 p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-brand-midnight">
                  {rv.profiles?.full_name ?? (isRTL ? "مستخدم" : "A user")}
                </p>
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={13} className={i < rv.rating ? "text-amber-400 fill-amber-400" : "text-black/10"} />
                  ))}
                </div>
              </div>
              <p className="text-xs text-brand-ink/40 mt-0.5">{formatDate(rv.created_at, isRTL ? "ar-SA" : "en-US")}</p>
              {comment && <p className="text-sm text-brand-ink/70 mt-2">{comment}</p>}

              {rv.vendor_response ? (
                <div className="mt-3 pl-3 border-l-2 border-brand-gold/30 text-sm text-brand-ink/60">
                  <span className="text-xs font-medium text-brand-gold">{isRTL ? "ردك:" : "Your response:"}</span>
                  <p>{rv.vendor_response}</p>
                </div>
              ) : (
                <div className="mt-3 flex items-center gap-2">
                  <input
                    className="flex-1 rounded-xl border border-black/10 px-3 py-2 text-sm focus:outline-none focus:border-brand-gold/50"
                    placeholder={isRTL ? "اكتب ردك على هذا التقييم..." : "Respond to this review..."}
                    value={drafts[rv.id] ?? ""}
                    onChange={(e) => setDrafts((d) => ({ ...d, [rv.id]: e.target.value }))}
                    onKeyDown={(e) => e.key === "Enter" && respond(rv.id)}
                  />
                  <button
                    onClick={() => respond(rv.id)}
                    disabled={sending === rv.id || !(drafts[rv.id] ?? "").trim()}
                    className="p-2.5 rounded-xl bg-brand-gold text-white disabled:opacity-40 hover:bg-brand-gold/90"
                  >
                    <Send size={14} />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
