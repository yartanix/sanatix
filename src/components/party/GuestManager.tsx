"use client";

import { useState, useEffect, useCallback } from "react";
import { Share2, Copy, Check, Trash2, UserPlus, Contact, RefreshCw, MessageCircle, BadgeCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { PartyGuest, RsvpStatus } from "@/types";

// Chrome on Android exposes navigator.contacts for picking real device
// contacts from the browser (no app install needed); other browsers
// don't implement it, so this is feature-detected and the manual
// name/phone fields are always available as the universal fallback.
interface ContactsSelectAPI {
  select: (properties: string[], options?: { multiple?: boolean }) => Promise<{ name?: string[]; tel?: string[] }[]>;
}
declare global {
  interface Navigator {
    contacts?: ContactsSelectAPI;
  }
}

const STATUS_LABEL: Record<RsvpStatus, { en: string; ar: string; className: string }> = {
  pending: { en: "Pending", ar: "بانتظار الرد", className: "bg-black/5 text-brand-ink/50" },
  yes: { en: "Going", ar: "سيحضر", className: "bg-emerald-50 text-emerald-700" },
  maybe: { en: "Maybe", ar: "ربما", className: "bg-amber-50 text-amber-700" },
  no: { en: "Can't go", ar: "لن يحضر", className: "bg-rose-50 text-rose-700" },
};

export default function GuestManager({
  partyId,
  partyTitle,
  initialGuests,
  rsvpBaseUrl,
  isRTL,
}: {
  partyId: string;
  partyTitle: string;
  initialGuests: PartyGuest[];
  rsvpBaseUrl: string;
  isRTL: boolean;
}) {
  const [guests, setGuests] = useState<PartyGuest[]>(initialGuests);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [adding, setAdding] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [contactsSupported, setContactsSupported] = useState(false);
  const [nativeShareSupported, setNativeShareSupported] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    setContactsSupported(typeof navigator !== "undefined" && !!navigator.contacts);
    setNativeShareSupported(typeof navigator !== "undefined" && !!navigator.share);
  }, []);

  async function addGuests(rows: { name: string; phone?: string }[]) {
    if (rows.length === 0) return;
    setAdding(true);
    try {
      const res = await fetch(`/api/parties/${partyId}/guests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guests: rows }),
      });
      if (!res.ok) throw new Error("failed");
      const { guests: newGuests } = await res.json();
      setGuests((prev) => [...prev, ...(newGuests as PartyGuest[])]);
    } catch {
      // Best-effort UI; the form stays filled so the host can just retry.
    } finally {
      setAdding(false);
    }
  }

  async function handleManualAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    await addGuests([{ name: name.trim(), phone: phone.trim() || undefined }]);
    setName("");
    setPhone("");
  }

  async function handlePickFromContacts() {
    if (!navigator.contacts) return;
    try {
      const selected = await navigator.contacts.select(["name", "tel"], { multiple: true });
      const rows = selected
        .map((c) => ({ name: c.name?.[0]?.trim() ?? "", phone: c.tel?.[0] }))
        .filter((c) => c.name.length > 0);
      await addGuests(rows);
    } catch {
      // User cancelled the picker — nothing to do.
    }
  }

  async function removeGuest(id: string) {
    setGuests((prev) => prev.filter((g) => g.id !== id));
    await fetch(`/api/parties/${partyId}/guests?guestId=${id}`, { method: "DELETE" }).catch(() => {});
  }

  // The host already has full RLS access to their own party_guests rows
  // (migration 011's "hosts manage their own party guests" policy), so a
  // direct update from here needs no new API route — same pattern as the
  // mobile app's addGuest/removeGuest, which also write straight to
  // Supabase.
  async function toggleCheckedIn(guest: PartyGuest) {
    const nextValue = guest.checked_in_at ? null : new Date().toISOString();
    setGuests((prev) =>
      prev.map((g) => (g.id === guest.id ? { ...g, checked_in_at: nextValue, checked_in_via: nextValue ? "host" : null } : g))
    );
    const supabase = createClient();
    await supabase
      .from("party_guests")
      .update({ checked_in_at: nextValue, checked_in_via: nextValue ? "host" : null })
      .eq("id", guest.id);
  }

  const refreshStatuses = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch(`/api/parties/${partyId}`);
      if (res.ok) {
        const { guests: fresh } = await res.json();
        setGuests(fresh as PartyGuest[]);
      }
    } finally {
      setRefreshing(false);
    }
  }, [partyId]);

  async function shareInvite(guest: PartyGuest) {
    const url = `${rsvpBaseUrl}/${guest.rsvp_token}`;
    const text = isRTL
      ? `مرحباً ${guest.name}، أنت مدعو إلى "${partyTitle}"! أضف ردك هنا:`
      : `Hi ${guest.name}, you're invited to "${partyTitle}"! RSVP here:`;

    if (navigator.share) {
      try {
        await navigator.share({ title: partyTitle, text, url });
        return;
      } catch {
        // User cancelled the native share sheet — fall through to copy.
      }
    }
    try {
      await navigator.clipboard.writeText(`${text} ${url}`);
      setCopiedId(guest.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Clipboard API unavailable — nothing more we can do silently.
    }
  }

  const yesCount = guests.filter((g) => g.rsvp_status === "yes").length;
  const inputClass =
    "w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm text-brand-midnight placeholder:text-brand-ink/35 focus:outline-none focus:border-brand-gold/50";

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-black/5 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-brand-midnight">{isRTL ? "الضيوف" : "Guests"}</h2>
          <button
            type="button"
            onClick={refreshStatuses}
            disabled={refreshing}
            className="flex items-center gap-1.5 text-xs font-semibold text-brand-ink/50 hover:text-brand-gold transition-colors disabled:opacity-50"
          >
            <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} />
            {isRTL ? "تحديث الردود" : "Refresh RSVPs"}
          </button>
        </div>

        {contactsSupported && (
          <button
            type="button"
            onClick={handlePickFromContacts}
            disabled={adding}
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-brand-gold/40 py-3 text-sm font-semibold text-brand-gold hover:bg-brand-sand transition-colors disabled:opacity-50"
          >
            <Contact size={16} />
            {isRTL ? "اختر من جهات الاتصال" : "Pick from contacts"}
          </button>
        )}

        <form onSubmit={handleManualAdd} className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={isRTL ? "اسم الضيف" : "Guest name"}
            className={inputClass}
          />
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder={isRTL ? "رقم الهاتف (اختياري)" : "Phone (optional)"}
            className={inputClass}
          />
          <button
            type="submit"
            disabled={adding || !name.trim()}
            className="shrink-0 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-brand-midnight text-white text-sm font-semibold disabled:opacity-40 hover:bg-brand-midnight/90 transition-colors"
          >
            <UserPlus size={15} />
            {isRTL ? "إضافة" : "Add"}
          </button>
        </form>
      </div>

      {guests.length === 0 ? (
        <div className="bg-white rounded-2xl border border-black/5 p-8 text-center text-sm text-brand-ink/45">
          {isRTL ? "لم تضف أي ضيف بعد" : "No guests added yet"}
        </div>
      ) : (
        <>
          <p className="text-xs font-semibold text-brand-ink/45">
            {isRTL ? `${yesCount} من ${guests.length} سيحضرون` : `${yesCount} of ${guests.length} going`}
          </p>
          <div className="space-y-2">
            {guests.map((guest) => {
              const label = STATUS_LABEL[guest.rsvp_status];
              return (
                <div
                  key={guest.id}
                  className="flex items-center justify-between gap-3 bg-white rounded-xl border border-black/5 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-brand-midnight truncate">{guest.name}</p>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                      <span className={`inline-block text-[11px] font-semibold rounded-full px-2 py-0.5 ${label.className}`}>
                        {isRTL ? label.ar : label.en}
                        {guest.rsvp_status === "yes" && guest.guest_count > 1 ? ` · ${guest.guest_count}` : ""}
                      </span>
                      {guest.invite_channel !== "none" && (
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-semibold rounded-full px-2 py-0.5 ${
                            guest.invite_status === "sent"
                              ? "bg-sky-50 text-sky-700"
                              : guest.invite_status === "failed"
                                ? "bg-rose-50 text-rose-700"
                                : "bg-black/5 text-brand-ink/45"
                          }`}
                        >
                          <MessageCircle size={10} />
                          {guest.invite_channel === "whatsapp" ? "WhatsApp" : "SMS"}
                          {guest.invite_status === "sent" ? (isRTL ? " · أُرسلت" : " · sent") : ""}
                          {guest.invite_status === "failed" ? (isRTL ? " · فشلت" : " · failed") : ""}
                        </span>
                      )}
                      {guest.checked_in_at && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold rounded-full px-2 py-0.5 bg-emerald-50 text-emerald-700">
                          <BadgeCheck size={10} />
                          {isRTL ? "دخل" : "Checked in"}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => toggleCheckedIn(guest)}
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                        guest.checked_in_at
                          ? "text-emerald-600 hover:bg-emerald-50"
                          : "text-brand-ink/35 hover:text-brand-gold hover:bg-brand-sand"
                      }`}
                      title={isRTL ? "تبديل تسجيل الدخول" : "Toggle checked-in"}
                    >
                      <BadgeCheck size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => shareInvite(guest)}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-brand-ink/50 hover:text-brand-gold hover:bg-brand-sand transition-colors"
                      title={isRTL ? "مشاركة الدعوة" : "Share invite"}
                    >
                      {copiedId === guest.id ? (
                        <Check size={15} className="text-emerald-600" />
                      ) : nativeShareSupported ? (
                        <Share2 size={15} />
                      ) : (
                        <Copy size={15} />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeGuest(guest.id)}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-brand-ink/35 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title={isRTL ? "إزالة" : "Remove"}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
