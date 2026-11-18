"use client";

import { useState } from "react";
import { UserPlus, Share2, Copy, Check, X, MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import DirectoryBrowser from "@/components/community/DirectoryBrowser";
import type { DirectoryProfile } from "@/types";

interface Props {
  eventId: string;
  eventTitle: string;
  shareUrl: string;
  initialInvites: DirectoryProfile[];
  isRTL: boolean;
}

/**
 * Organizer-side invite flow for a ticketed event: search Sanatix users
 * first (DirectoryBrowser in picker mode, backed by add_event_invite()),
 * which grants "shared event" status without a booking -- then fall back
 * to sharing the event's own page link via WhatsApp/native share for
 * people who don't have a Sanatix account. Mirrors the literal original
 * request ("shows first list of other sanatix users and then users with
 * no sanatix to send invitations by whatsapp and other social media").
 */
export default function EventInviteManager({ eventId, eventTitle, shareUrl, initialInvites, isRTL }: Props) {
  const [invites, setInvites] = useState<DirectoryProfile[]>(initialInvites);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const nativeShareSupported = typeof navigator !== "undefined" && !!navigator.share;

  async function handlePick(profile: DirectoryProfile) {
    setError(null);
    const supabase = createClient();
    const { error: inviteError } = await supabase.rpc("add_event_invite", {
      p_event_id: eventId,
      p_user_id: profile.id,
    });
    if (inviteError) {
      setError(isRTL ? "تعذّرت الدعوة." : "Couldn't send that invite.");
      return;
    }
    setInvites((prev) => (prev.some((p) => p.id === profile.id) ? prev : [...prev, profile]));
  }

  function shareText() {
    return isRTL
      ? `أنت مدعو إلى "${eventTitle}" على سناتيكس! التفاصيل هنا:`
      : `You're invited to "${eventTitle}" on Sanatix! Details here:`;
  }

  async function shareWhatsApp() {
    const text = `${shareText()} ${shareUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  }

  async function shareGeneric() {
    if (navigator.share) {
      try {
        await navigator.share({ title: eventTitle, text: shareText(), url: shareUrl });
        return;
      } catch {
        // User cancelled the native share sheet — fall through to copy.
      }
    }
    try {
      await navigator.clipboard.writeText(`${shareText()} ${shareUrl}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable — nothing more we can do silently.
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-black/5 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-brand-midnight">{isRTL ? "دعوة مستخدمين" : "Invite people"}</h2>
        <button
          type="button"
          onClick={() => setPickerOpen((v) => !v)}
          className="flex items-center gap-1.5 text-xs font-semibold text-brand-midnight rounded-full px-3.5 py-2 bg-gradient-to-br from-brand-gold-light to-brand-gold hover:opacity-90 transition-opacity"
        >
          <UserPlus size={13} />
          {isRTL ? "ابحث عن مستخدمي سناتيكس" : "Search Sanatix users"}
        </button>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-2.5 text-sm text-red-700">{error}</div>
      )}

      {pickerOpen && (
        <div className="bg-brand-warm-white rounded-2xl p-4 relative">
          <button
            type="button"
            onClick={() => setPickerOpen(false)}
            className="absolute top-3 end-3 text-brand-ink/40 hover:text-brand-midnight p-1"
          >
            <X size={15} />
          </button>
          <p className="text-xs text-brand-ink/50 mb-3 pe-6">
            {isRTL
              ? "دعوة مستخدم تمنحه إمكانية التواصل ومحادثة الفعالية الجماعية دون حجز تذكرة."
              : "Inviting someone grants messaging and the event's group chat without a ticket booking."}
          </p>
          <DirectoryBrowser
            initialProfiles={[]}
            isRTL={isRTL}
            onPick={handlePick}
            excludeIds={invites.map((p) => p.id)}
          />
        </div>
      )}

      {invites.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-brand-ink/45 mb-2">
            {isRTL ? `تمت دعوة ${invites.length}` : `${invites.length} invited`}
          </p>
          <div className="flex flex-wrap gap-2">
            {invites.map((p) => (
              <span
                key={p.id}
                className="text-xs font-medium text-brand-midnight bg-brand-sand rounded-full px-3 py-1.5"
              >
                {p.full_name ?? (isRTL ? "مستخدم سناتيكس" : "Sanatix user")}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="pt-2 border-t border-black/5">
        <p className="text-xs text-brand-ink/50 mb-2">
          {isRTL
            ? "لمن ليس لديه حساب سناتيكس، شارك رابط الفعالية مباشرة:"
            : "For people without a Sanatix account, share the event link directly:"}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={shareWhatsApp}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-600 transition-colors"
          >
            <MessageCircle size={15} />
            WhatsApp
          </button>
          <button
            type="button"
            onClick={shareGeneric}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-brand-midnight text-white text-sm font-semibold hover:bg-brand-midnight/90 transition-colors"
          >
            {copied ? <Check size={15} /> : nativeShareSupported ? <Share2 size={15} /> : <Copy size={15} />}
            {isRTL ? "مشاركة" : "Share"}
          </button>
        </div>
      </div>
    </div>
  );
}
