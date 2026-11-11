"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { Check, Loader2 } from "lucide-react";

export interface ReviewSummary {
  title: string;
  dateLabel: string;
  cityLabel: string;
  ageLabel: string;
  budgetLabel: string;
  needLabels: string[];
  venueLabel: string | null;
  locationLabel: string | null;
}

export interface ReviewPayload {
  title: string;
  startsAt: string;
  locationName: string | null;
  locationAddress: string | null;
  lat: number | null;
  lng: number | null;
  notes: string;
}

// Step 4 — the last step. Nothing here touches the database until the
// visitor actually presses "Complete": this is read-only confirmation
// of everything chosen in steps 1–3, reusing the exact same
// POST /api/parties endpoint the standalone "New Party" form already
// uses, so a party created this way behaves identically (guest
// invites, RSVP links, door check-in — all of it already works).
export default function ReviewStep({
  isRTL,
  summary,
  payload,
  editHrefs,
}: {
  isRTL: boolean;
  summary: ReviewSummary;
  payload: ReviewPayload;
  editHrefs: { occasion: string; preferences: string; venue: string };
}) {
  const router = useRouter();
  const locale = useLocale();
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function complete() {
    setSaving(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/parties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: payload.title,
          startsAt: payload.startsAt,
          locationName: payload.locationName ?? undefined,
          locationAddress: payload.locationAddress ?? undefined,
          lat: payload.lat ?? undefined,
          lng: payload.lng ?? undefined,
          notes: payload.notes || undefined,
        }),
      });
      if (res.status === 401) {
        // `next` needs its own locale prefix and a plain navigation,
        // same convention the login page itself documents — the
        // locale-aware router would double-prefix it.
        const next = `/${locale}/plan-a-party?${window.location.search.replace(/^\?/, "")}`;
        window.location.assign(`/${locale}/login?next=${encodeURIComponent(next)}`);
        return;
      }
      if (!res.ok) throw new Error("failed");
      const { party } = await res.json();
      router.push(`/parties/${party.id}`);
    } catch {
      setErrorMsg(isRTL ? "تعذر إكمال الحفلة، حاول مرة أخرى" : "Couldn't complete — try again");
      setSaving(false);
    }
  }

  const row = (label: string, value: string, editHref: string) => (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-black/5 last:border-0">
      <div>
        <p className="text-xs text-brand-ink/45 mb-0.5">{label}</p>
        <p className="text-sm font-medium text-brand-midnight">{value}</p>
      </div>
      <a href={editHref} className="text-xs text-brand-gold hover:underline whitespace-nowrap mt-0.5">
        {isRTL ? "تعديل" : "Edit"}
      </a>
    </div>
  );

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-2xl font-bold tracking-tight text-brand-midnight mb-1">
        {isRTL ? "راجع التفاصيل" : "Review your details"}
      </h1>
      <p className="text-sm text-brand-ink/55 mb-8">
        {isRTL ? "تحقق من كل شيء قبل الإكمال" : "Check everything before you complete"}
      </p>

      <div className="bg-white rounded-2xl border border-black/5 px-5">
        {row(isRTL ? "المناسبة" : "Occasion", `${summary.title} · ${summary.dateLabel}`, editHrefs.occasion)}
        {row(isRTL ? "التفاصيل" : "Preferences", `${summary.ageLabel} · ${summary.cityLabel} · ${summary.budgetLabel}`, editHrefs.preferences)}
        {summary.needLabels.length > 0 && row(isRTL ? "الاحتياجات" : "Needs", summary.needLabels.join(", "), editHrefs.preferences)}
        {row(
          isRTL ? "القاعة أو الموقع" : "Venue or location",
          summary.venueLabel ?? summary.locationLabel ?? (isRTL ? "لم يُحدد" : "Not set"),
          editHrefs.venue
        )}
      </div>

      {errorMsg && <p className="text-sm text-rose-600 mt-4">{errorMsg}</p>}

      <button
        onClick={complete}
        disabled={saving}
        className="mt-6 w-full flex items-center justify-center gap-2 bg-gradient-to-br from-brand-gold-light to-brand-gold text-brand-midnight font-semibold py-3.5 rounded-xl text-sm hover:opacity-90 transition-opacity disabled:opacity-60"
      >
        {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
        {saving ? (isRTL ? "جارٍ الإكمال..." : "Completing...") : isRTL ? "إكمال" : "Complete"}
      </button>
      <p className="text-xs text-center text-brand-ink/40 mt-3">
        {isRTL ? "سجّل الدخول إذا طُلب منك ذلك، ثم يمكنك دعوة الضيوف" : "You'll be asked to sign in if needed, then you can invite guests"}
      </p>
    </div>
  );
}
