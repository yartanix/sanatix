"use client";

import { useState } from "react";
import { Send, Check } from "lucide-react";

// Public, no-account-required "contact this vendor" form — the other
// end of the vendor's own Inquiries inbox (src/components/vendor/
// VendorInquiriesList.tsx). Posts to /api/vendors/[id]/inquiries.
export default function VendorInquiryForm({ vendorId, isRTL }: { vendorId: string; isRTL: boolean }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !message.trim() || sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/vendors/${vendorId}/inquiries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), phone: phone.trim() || undefined, message: message.trim() }),
      });
      if (!res.ok) throw new Error();
      setSent(true);
    } catch {
      setError(isRTL ? "تعذر إرسال الاستفسار، حاول مرة أخرى" : "Couldn't send — try again");
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <div className="bg-white rounded-2xl border border-black/5 p-5 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
          <Check size={14} className="text-emerald-600" />
        </div>
        <p className="text-sm text-brand-ink/70">
          {isRTL ? "تم إرسال استفسارك، سيتواصل معك المورد قريباً" : "Your inquiry was sent — the vendor will reach out soon"}
        </p>
      </div>
    );
  }

  const inputClass = "w-full rounded-xl border border-black/10 px-3.5 py-2.5 text-sm focus:outline-none focus:border-brand-gold/50";

  return (
    <form onSubmit={submit} className="bg-white rounded-2xl border border-black/5 p-5 space-y-3">
      <h2 className="text-sm font-medium text-brand-midnight">
        {isRTL ? "تواصل مع هذا المورد" : "Ask this vendor"}
      </h2>
      <input className={inputClass} placeholder={isRTL ? "اسمك" : "Your name"} value={name} onChange={(e) => setName(e.target.value)} required />
      <input className={inputClass} placeholder={isRTL ? "رقم الجوال (اختياري)" : "Phone (optional)"} value={phone} onChange={(e) => setPhone(e.target.value)} />
      <textarea className={inputClass} rows={3} placeholder={isRTL ? "رسالتك..." : "Your message..."} value={message} onChange={(e) => setMessage(e.target.value)} required />
      {error && <p className="text-xs text-rose-600">{error}</p>}
      <button
        type="submit"
        disabled={sending}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-brand-gold text-white text-sm font-medium hover:bg-brand-gold/90 disabled:opacity-50"
      >
        <Send size={13} />
        {sending ? (isRTL ? "جارٍ الإرسال..." : "Sending...") : (isRTL ? "إرسال الاستفسار" : "Send inquiry")}
      </button>
    </form>
  );
}
