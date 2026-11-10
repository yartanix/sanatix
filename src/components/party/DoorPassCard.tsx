"use client";

import { useState } from "react";
import { Share2, Copy, Check, DoorOpen } from "lucide-react";

// Lets the host hand off door duty — to a friend, or to a staffing
// vendor booked through the marketplace's new "Event Staffing &
// Check-in" category — without giving them a Sanatix account. The
// door-pass link can only check guests of this one party in; it can
// never list them (see checkin_by_door_pass, migration 015).
export default function DoorPassCard({
  doorPassUrl,
  partyTitle,
  isRTL,
}: {
  doorPassUrl: string;
  partyTitle: string;
  isRTL: boolean;
}) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const text = isRTL
      ? `رابط تسجيل الدخول لحفلة "${partyTitle}" — استخدمه للتحقق من الضيوف عند الباب`
      : `Door check-in link for "${partyTitle}" — use this to check guests in at the door`;

    if (navigator.share) {
      try {
        await navigator.share({ title: partyTitle, text, url: doorPassUrl });
        return;
      } catch {
        // cancelled — fall through to copy
      }
    }
    try {
      await navigator.clipboard.writeText(`${text}: ${doorPassUrl}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable — nothing more we can do silently
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-black/5 p-5 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <DoorOpen size={16} className="text-brand-gold shrink-0" />
          <h2 className="font-bold text-brand-midnight">{isRTL ? "رابط الباب" : "Door check-in link"}</h2>
        </div>
        <p className="text-xs text-brand-ink/50 mt-1">
          {isRTL
            ? "شاركه مع من سيتحقق من الضيوف — لا يحتاج حساباً"
            : "Share with whoever's checking guests in — they don't need an account"}
        </p>
      </div>
      <button
        type="button"
        onClick={share}
        className="shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-brand-midnight text-white text-xs font-semibold hover:bg-brand-midnight/90 transition-colors"
      >
        {copied ? <Check size={14} className="text-emerald-400" /> : <Share2 size={14} />}
        {copied ? (isRTL ? "تم النسخ" : "Copied") : isRTL ? "مشاركة" : "Share"}
      </button>
    </div>
  );
}
