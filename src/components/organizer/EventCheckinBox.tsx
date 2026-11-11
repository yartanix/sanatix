"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DoorOpen, Check, X } from "lucide-react";

// Manual entry only — same reasoning as CheckinScanner.tsx for party
// door-passes: this site's Permissions-Policy disables camera
// site-wide, so this never requests it. Organizer types the booking's
// qr_code (or its 8-char prefix) printed on the attendee's ticket PDF.
export default function EventCheckinBox({ eventId, isRTL }: { eventId: string; isRTL: boolean }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const ref = code.trim();
    if (!ref || submitting) return;
    setSubmitting(true);
    setResult(null);
    try {
      const res = await fetch(`/api/organizer/events/${eventId}/checkin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: ref }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult({ ok: false, message: isRTL ? "لم يتم العثور على حجز بهذا الرمز" : "No booking found for that code" });
      } else {
        setResult({
          ok: true,
          message: data.alreadyCheckedIn
            ? (isRTL ? `${data.guestName} — تم تسجيل دخوله مسبقاً` : `${data.guestName} — already checked in`)
            : (isRTL ? `${data.guestName} — تم الدخول ✓` : `${data.guestName} — checked in ✓`),
        });
        router.refresh();
      }
    } catch {
      setResult({ ok: false, message: isRTL ? "تعذر الاتصال، حاول مرة أخرى" : "Couldn't connect — try again" });
    } finally {
      setSubmitting(false);
      setCode("");
    }
  }

  return (
    <form onSubmit={submit} className="bg-white rounded-2xl border border-black/5 p-5 space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-brand-midnight">
        <DoorOpen size={15} className="text-brand-gold" />
        {isRTL ? "تسجيل دخول حاضر" : "Check in an attendee"}
      </div>
      <div className="flex items-center gap-2">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder={isRTL ? "رمز التذكرة" : "Ticket code"}
          className="flex-1 rounded-xl border border-black/10 px-3.5 py-2.5 text-sm font-mono tracking-wider focus:outline-none focus:border-brand-gold/50"
        />
        <button
          type="submit"
          disabled={!code.trim() || submitting}
          className="px-4 py-2.5 rounded-xl bg-brand-gold text-white text-sm font-medium disabled:opacity-40 hover:bg-brand-gold/90"
        >
          {submitting ? (isRTL ? "..." : "...") : (isRTL ? "دخول" : "Check in")}
        </button>
      </div>
      {result && (
        <div className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium ${result.ok ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
          {result.ok ? <Check size={14} /> : <X size={14} />}
          {result.message}
        </div>
      )}
    </form>
  );
}
