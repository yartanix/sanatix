"use client";

import { useState } from "react";
import { DoorOpen, Check, X } from "lucide-react";

// Manual entry only, deliberately — this site's Permissions-Policy
// disables camera site-wide (confirmed unused, locked down in the
// security audit), so this never requests it. Door staff read the
// short 8-character code printed under a guest's QR (or scan that QR
// with any ordinary camera app, which just decodes to plain text they
// can paste here) rather than this page opening a camera itself.
export default function CheckinScanner({ doorPass, isRTL }: { doorPass: string; isRTL: boolean }) {
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
      const res = await fetch(`/api/checkin/${doorPass}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guestRef: ref }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult({ ok: false, message: isRTL ? "لم يتم العثور على ضيف بهذا الرمز" : "No guest found for that code" });
      } else if (data.alreadyCheckedIn) {
        setResult({
          ok: true,
          message: isRTL ? `${data.guestName} — تم تسجيل دخوله مسبقاً` : `${data.guestName} — already checked in`,
        });
      } else {
        setResult({ ok: true, message: isRTL ? `${data.guestName} — تم الدخول ✓` : `${data.guestName} — checked in ✓` });
      }
    } catch {
      setResult({ ok: false, message: isRTL ? "تعذر الاتصال، حاول مرة أخرى" : "Couldn't connect — try again" });
    } finally {
      setSubmitting(false);
      setCode("");
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="flex items-center gap-2 text-brand-ink/60 text-sm">
        <DoorOpen size={16} className="text-brand-gold" />
        {isRTL ? "أدخل الرمز الظاهر تحت رمز الاستجابة السريعة للضيف" : "Enter the code shown under the guest's QR"}
      </div>
      <input
        type="text"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder={isRTL ? "مثال: 7F3A9C2B" : "e.g. 7F3A9C2B"}
        autoCapitalize="characters"
        autoFocus
        className="w-full rounded-xl border border-black/10 bg-white px-4 py-3.5 text-center font-mono tracking-[0.3em] text-lg uppercase text-brand-midnight placeholder:text-brand-ink/25 focus:outline-none focus:border-brand-gold/50"
      />
      <button
        type="submit"
        disabled={!code.trim() || submitting}
        className="w-full py-3.5 rounded-xl bg-gradient-to-br from-brand-gold-light to-brand-gold text-brand-midnight text-sm font-bold disabled:opacity-40 hover:opacity-90 transition-opacity"
      >
        {submitting ? (isRTL ? "جارٍ التحقق..." : "Checking...") : isRTL ? "تسجيل الدخول" : "Check in"}
      </button>

      {result && (
        <div
          className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold ${
            result.ok ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
          }`}
        >
          {result.ok ? <Check size={16} /> : <X size={16} />}
          {result.message}
        </div>
      )}
    </form>
  );
}
