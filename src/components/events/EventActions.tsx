"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/client";
import { Heart, Share2, Check } from "lucide-react";

interface EventActionsProps {
  eventId: string;
  initiallySaved: boolean;
  title: string;
  isRTL: boolean;
}

export default function EventActions({ eventId, initiallySaved, title, isRTL }: EventActionsProps) {
  const router = useRouter();
  const supabase = createClient();
  const [saved, setSaved] = useState(initiallySaved);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  async function toggleSave() {
    if (saving) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`); return; }

    setSaving(true);
    const next = !saved;
    setSaved(next); // optimistic
    const res = await fetch("/api/favorites", {
      method: next ? "POST" : "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event_id: eventId }),
    });
    setSaving(false);
    if (!res.ok) setSaved(!next); // revert on failure
  }

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
    <div className="flex items-center gap-2 shrink-0">
      <button
        onClick={toggleSave}
        disabled={saving}
        aria-pressed={saved}
        className="p-2.5 rounded-xl border border-black/10 bg-white hover:bg-brand-sand transition-colors disabled:opacity-60"
      >
        <Heart size={18} className={saved ? "text-red-500 fill-red-500" : "text-brand-ink/50"} />
      </button>
      <button
        onClick={share}
        className="relative p-2.5 rounded-xl border border-black/10 bg-white hover:bg-brand-sand transition-colors"
      >
        {copied ? <Check size={18} className="text-green-500" /> : <Share2 size={18} className="text-brand-ink/50" />}
        {copied && (
          <span className="absolute -bottom-7 start-1/2 -translate-x-1/2 text-[11px] whitespace-nowrap bg-brand-midnight text-white px-2 py-1 rounded-lg">
            {isRTL ? "تم النسخ" : "Link copied"}
          </span>
        )}
      </button>
    </div>
  );
}
