"use client";

import { useState } from "react";
import { Check, X, HelpCircle } from "lucide-react";
import type { RsvpStatus } from "@/types";

export default function RsvpForm({
  token,
  initialStatus,
  initialGuestCount,
  isRTL,
}: {
  token: string;
  initialStatus: RsvpStatus;
  initialGuestCount: number;
  isRTL: boolean;
}) {
  const [status, setStatus] = useState<RsvpStatus>(initialStatus);
  const [guestCount, setGuestCount] = useState(initialGuestCount || 1);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(initialStatus !== "pending");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function respond(newStatus: "yes" | "no" | "maybe", count: number) {
    setSaving(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/rsvp/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, guestCount: count }),
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

      {status === "yes" && (
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

      {saved && !errorMsg && (
        <p className="text-center text-xs text-brand-ink/45">
          {isRTL ? "تم حفظ ردك — يمكنك تغييره في أي وقت" : "Your response is saved — you can change it anytime"}
        </p>
      )}
      {errorMsg && <p className="text-center text-xs text-rose-600">{errorMsg}</p>}
    </div>
  );
}
