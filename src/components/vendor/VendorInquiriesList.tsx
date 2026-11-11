"use client";

import { useState } from "react";
import type { VendorInquiry } from "@/types";
import { formatDate } from "@/lib/utils";
import { MessageSquare, Phone, Mail, Calendar, Send } from "lucide-react";

export default function VendorInquiriesList({
  locale,
  initialInquiries,
}: {
  locale: string;
  initialInquiries: VendorInquiry[];
}) {
  const isRTL = locale === "ar";
  const [inquiries, setInquiries] = useState(initialInquiries);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [sending, setSending] = useState<string | null>(null);

  async function respond(id: string) {
    const text = (drafts[id] ?? "").trim();
    if (!text) return;
    setSending(id);
    try {
      const res = await fetch(`/api/vendor/inquiries/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vendorResponse: text }),
      });
      if (res.ok) {
        const updated = await res.json();
        setInquiries((prev) => prev.map((i) => (i.id === id ? updated : i)));
        setDrafts((d) => ({ ...d, [id]: "" }));
      }
    } finally {
      setSending(null);
    }
  }

  if (inquiries.length === 0) {
    return (
      <div className="max-w-2xl bg-white rounded-2xl border border-black/5 p-10 text-center">
        <MessageSquare size={24} className="mx-auto text-brand-ink/25 mb-3" />
        <p className="text-sm text-brand-ink/50">
          {isRTL ? "لا توجد استفسارات بعد" : "No inquiries yet"}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-5">
      <h1 className="text-xl font-semibold text-brand-midnight">
        {isRTL ? "الاستفسارات" : "Inquiries"}
      </h1>

      <div className="space-y-4">
        {inquiries.map((inq) => (
          <div key={inq.id} className="bg-white rounded-2xl border border-black/5 p-5">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <p className="text-sm font-semibold text-brand-midnight">{inq.name}</p>
                <div className="flex items-center gap-3 text-xs text-brand-ink/40 mt-1">
                  {inq.phone && <span className="flex items-center gap-1"><Phone size={11} />{inq.phone}</span>}
                  {inq.email && <span className="flex items-center gap-1"><Mail size={11} />{inq.email}</span>}
                  {inq.event_date && <span className="flex items-center gap-1"><Calendar size={11} />{formatDate(inq.event_date, isRTL ? "ar-SA" : "en-US")}</span>}
                </div>
              </div>
              <span
                className={`text-[10px] font-semibold px-2 py-1 rounded-full shrink-0 ${
                  inq.status === "new"
                    ? "bg-brand-gold/15 text-brand-gold"
                    : inq.status === "responded"
                    ? "bg-emerald-50 text-emerald-600"
                    : "bg-black/5 text-brand-ink/40"
                }`}
              >
                {inq.status === "new" ? (isRTL ? "جديد" : "NEW") : inq.status === "responded" ? (isRTL ? "تم الرد" : "RESPONDED") : (isRTL ? "مغلق" : "CLOSED")}
              </span>
            </div>

            <p className="text-sm text-brand-ink/70 mt-2">{inq.message}</p>

            {inq.vendor_response ? (
              <div className="mt-3 pl-3 border-l-2 border-brand-gold/30 text-sm text-brand-ink/60">
                <span className="text-xs font-medium text-brand-gold">{isRTL ? "ردك:" : "Your response:"}</span>
                <p>{inq.vendor_response}</p>
              </div>
            ) : (
              <div className="mt-3 flex items-center gap-2">
                <input
                  className="flex-1 rounded-xl border border-black/10 px-3 py-2 text-sm focus:outline-none focus:border-brand-gold/50"
                  placeholder={isRTL ? "اكتب ردك هنا..." : "Write your response..."}
                  value={drafts[inq.id] ?? ""}
                  onChange={(e) => setDrafts((d) => ({ ...d, [inq.id]: e.target.value }))}
                  onKeyDown={(e) => e.key === "Enter" && respond(inq.id)}
                />
                <button
                  onClick={() => respond(inq.id)}
                  disabled={sending === inq.id || !(drafts[inq.id] ?? "").trim()}
                  className="p-2.5 rounded-xl bg-brand-gold text-white disabled:opacity-40 hover:bg-brand-gold/90"
                >
                  <Send size={14} />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
