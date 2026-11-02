"use client";

import { useState } from "react";
import { Share2, Check } from "lucide-react";

export default function ShareButton({ title, isRTL }: { title: string; isRTL: boolean }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {
        // user cancelled the native share sheet — not an error
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable — nothing more we can do silently
    }
  }

  return (
    <button
      onClick={share}
      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-black/10 bg-white text-sm text-brand-ink/70 hover:bg-brand-sand transition-colors"
    >
      {copied ? <Check size={15} className="text-green-500" /> : <Share2 size={15} />}
      {copied ? (isRTL ? "تم النسخ" : "Link copied") : (isRTL ? "مشاركة" : "Share")}
    </button>
  );
}
