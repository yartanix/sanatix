"use client";

import { useEffect, useState } from "react";
import { Check, X, HelpCircle } from "lucide-react";
import QRCode from "qrcode";
import type { RsvpStatus } from "@/types";

export default function RsvpForm({
  token,
  initialStatus,
  initialGuestCount,
  allowPlusOnes,
  customQuestion,
  initialCustomAnswer,
  requireEntryCode,
  entryCode,
  isRTL,
}: {
  token: string;
  initialStatus: RsvpStatus;
  initialGuestCount: number;
  allowPlusOnes: boolean;
  customQuestion: string | null;
  initialCustomAnswer: string | null;
  requireEntryCode: boolean;
  entryCode: string | null;
  isRTL: boolean;
}) {
  const [status, setStatus] = useState<RsvpStatus>(initialStatus);
  const [guestCount, setGuestCount] = useState(initialGuestCount || 1);
  const [customAnswer, setCustomAnswer] = useState(initialCustomAnswer ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(initialStatus !== "pending");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  // The guest's own rsvp_token doubles as their door-check-in code once
  // they've said yes — same QR a door-pass holder can scan with any
  // generic QR app, or read the short code printed underneath. Generated
  // client-side (pure JS, no server round trip) the moment they're
  // confirmed.
  useEffect(() => {
    if (status !== "yes") {
      setQrDataUrl(null);
      return;
    }
    QRCode.toDataURL(token, { width: 220, margin: 1, color: { dark: "#1C1A17", light: "#FFFFFF" } })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null));
  }, [status, token]);

  async function respond(newStatus: "yes" | "no" | "maybe", count: number, answer?: string) {
    setSaving(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/rsvp/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          guestCount: count,
          customAnswer: answer !== undefined ? answer : customAnswer || undefined,
        }),
      });
      if (!res.ok) throw new Error("failed");
      setStatus(newStatus);
      setSaved(true);
    } catch {
      setErrorMsg(isRTL ? "تعذر حفظ ردك، حاول مرة أخرى" : "Couldn't save your response — try again");
    } finally {
      setSaving(false);
    }
  }

  const options: { key: "yes" | "no" | "maybe"; label: string; Icon: typeof Check; activeClass: string }[] = [
    {
      key: "yes",
      label: isRTL ? "سأحضر" : "I'll be there",
      Icon: Check,
      activeClass: "bg-emerald-500 text-white border-emerald-500",
    },
    {
      key: "maybe",
      label: isRTL ? "ربما" : "Maybe",
      Icon: HelpCircle,
      activeClass: "bg-amber-500 text-white border-amber-500",
    },
    {
      key: "no",
      label: isRTL ? "لا أستطيع" : "Can't make it",
      Icon: X,
      activeClass: "bg-rose-500 text-white border-rose-500",
    },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {options.map(({ key, label, Icon, activeClass }) => (
          <button
            key={key}
            type="button"
            disabled={saving}
            onClick={() => respond(key, guestCount)}
            className={`flex items-center justify-center gap-2 rounded-2xl border px-4 py-3.5 text-sm font-semibold transition-colors disabled:opacity-60 ${
              status === key ? activeClass : "border-black/10 bg-white text-brand-midnight hover:bg-brand-sand"
            }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {status === "yes" && allowPlusOnes && (
        <div className="flex items-center justify-between rounded-2xl border border-black/10 bg-white px-5 py-3.5">
          <span className="text-sm text-brand-ink/70">
            {isRTL ? "عدد الحضور (بما فيك)" : "How many of you (incl. you)?"}
          </span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                const next = Math.max(1, guestCount - 1);
                setGuestCount(next);
                respond("yes", next);
              }}
              className="w-8 h-8 rounded-full border border-black/10 flex items-center justify-center text-brand-midnight hover:bg-brand-sand"
            >
              −
            </button>
            <span className="w-6 text-center font-semibold text-brand-midnight">{guestCount}</span>
            <button
              type="button"
              onClick={() => {
                const next = Math.min(20, guestCount + 1);
                setGuestCount(next);
                respond("yes", next);
              }}
              className="w-8 h-8 rounded-full border border-black/10 flex items-center justify-center text-brand-midnight hover:bg-brand-sand"
            >
              +
            </button>
          </div>
        </div>
      )}

      {customQuestion && (status === "yes" || status === "maybe") && (
        <div className="rounded-2xl border border-black/10 bg-white px-5 py-4 space-y-2">
          <label className="text-sm text-brand-ink/70">{customQuestion}</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={customAnswer}
              onChange={(e) => setCustomAnswer(e.target.value)}
              onBlur={() => respond(status, guestCount, customAnswer)}
              placeholder={isRTL ? "إجابتك" : "Your answer"}
              className="flex-1 rounded-xl border border-black/10 px-3 py-2 text-sm text-brand-midnight placeholder:text-brand-ink/35 focus:outline-none focus:border-brand-gold/50"
            />
          </div>
        </div>
      )}

      {status === "yes" && qrDataUrl && (
        <div className="rounded-2xl border border-black/10 bg-white px-5 py-5 text-center space-y-2">
          <p className="text-xs font-semibold text-brand-ink/50">
            {isRTL ? "رمز الدخول — أظهره عند الباب" : "Your entry code — show this at the door"}
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element -- a data: URL, not an optimizable remote image */}
          <img src={qrDataUrl} alt="Check-in QR code" className="mx-auto w-40 h-40" />
          <p className="font-mono text-sm tracking-widest text-brand-ink/60">{token.slice(0, 8).toUpperCase()}</p>
          {requireEntryCode && entryCode && (
            <p className="text-xs text-brand-ink/45 pt-2 border-t border-black/5 mt-2">
              {isRTL ? "كلمة الدخول: " : "Password: "}
              <span className="font-mono font-semibold text-brand-midnight">{entryCode}</span>
            </p>
          )}
        </div>
      )}

      {saved && !errorMsg && (
        <p className="text-center text-xs text-brand-ink/45">
          {isRTL ? "تم حفظ ردك — يمكنك تغييره في أي وقت" : "Your response is saved — you can change it anytime"}
        </p>
      )}
      {errorMsg && <p className="text-center text-xs text-rose-600">{errorMsg}</p>}
    </div>
  );
}
