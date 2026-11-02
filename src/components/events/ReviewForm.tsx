"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/routing";
import { Star } from "lucide-react";

interface ReviewFormProps {
  eventId: string;
  isRTL: boolean;
  existingReview?: { rating: number; comment: string | null } | null;
}

export default function ReviewForm({ eventId, isRTL, existingReview }: ReviewFormProps) {
  const router = useRouter();
  const [rating, setRating] = useState(existingReview?.rating ?? 0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState(existingReview?.comment ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit() {
    if (rating === 0) return;
    setLoading(true);
    setError(null);
    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_id: eventId,
        rating,
        comment: comment.trim() || undefined,
        locale: isRTL ? "ar" : "en",
      }),
    });
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
    return (
      <div className="bg-brand-gold/5 border border-brand-gold/20 rounded-xl p-4 text-sm text-brand-ink/70">
        {isRTL ? "تم حفظ تقييمك. شكرًا لك!" : "Your review has been saved. Thank you!"}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-black/5 p-5 space-y-3">
      <p className="text-sm font-medium text-brand-midnight">
        {existingReview
          ? (isRTL ? "عدّل تقييمك" : "Edit your review")
          : (isRTL ? "قيّم هذه الفعالية" : "Rate this event")}
      </p>

      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n)}
            onMouseEnter={() => setHovered(n)}
            onMouseLeave={() => setHovered(0)}
            aria-label={`${n} ${isRTL ? "نجوم" : "stars"}`}
            className="p-0.5"
          >
            <Star
              size={22}
              className={(hovered || rating) >= n ? "text-brand-gold fill-brand-gold" : "text-brand-ink/20"}
            />
          </button>
        ))}
      </div>

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        maxLength={2000}
        rows={3}
        placeholder={isRTL ? "اكتب تعليقك (اختياري)" : "Share your thoughts (optional)"}
        className="w-full rounded-xl border border-black/10 p-3 text-sm text-brand-midnight placeholder:text-brand-ink/35 focus:outline-none focus:ring-2 focus:ring-brand-gold/30 resize-none"
      />

      {error && <p className="text-sm text-red-500">{error}</p>}

      <button
        onClick={submit}
        disabled={rating === 0 || loading}
        className="w-full bg-brand-midnight text-white py-2.5 rounded-xl text-sm font-medium hover:bg-brand-ink transition-colors disabled:opacity-40"
      >
        {loading ? (isRTL ? "جارٍ الحفظ..." : "Saving...") : existingReview ? (isRTL ? "تحديث التقييم" : "Update review") : (isRTL ? "إرسال التقييم" : "Submit review")}
      </button>
    </div>
  );
}
