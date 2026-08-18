"use client";

import { useState } from "react";
import { Plus, Trash2, Ticket } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface TicketType {
  id: string;
  name_ar: string;
  name_en: string;
  price: number;
  currency: string;
  total_quantity: number;
  sold_quantity: number;
  status: string;
}

const CURRENCIES = ["SAR", "AED", "KWD", "QAR", "USD"];

const emptyDraft = { name_ar: "", name_en: "", price: "0", currency: "SAR", total_quantity: "50" };

export default function TicketTypesManager({ eventId, isRTL, initialTickets }: { eventId: string; isRTL: boolean; initialTickets: TicketType[] }) {
  const [tickets, setTickets] = useState<TicketType[]>(initialTickets);
  const [draft, setDraft] = useState(emptyDraft);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function handleAdd() {
    if (!draft.name_ar.trim() || !draft.name_en.trim()) {
      setError(isRTL ? "الاسم مطلوب بالعربية والإنجليزية" : "Name is required in both languages");
      return;
    }
    setAdding(true);
    setError(null);
    const res = await fetch(`/api/organizer/events/${eventId}/tickets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name_ar: draft.name_ar,
        name_en: draft.name_en,
        price: Number(draft.price) || 0,
        currency: draft.currency,
        total_quantity: Math.max(1, Number(draft.total_quantity) || 1),
      }),
    });
    const result = await res.json();
    setAdding(false);
    if (!res.ok) {
      setError(result.error ?? (isRTL ? "تعذّرت الإضافة" : "Couldn't add ticket type"));
      return;
    }
    setTickets((prev) => [...prev, result]);
    setDraft(emptyDraft);
  }

  async function handleDelete(ticketId: string) {
    setBusyId(ticketId);
    setError(null);
    const res = await fetch(`/api/organizer/events/${eventId}/tickets/${ticketId}`, { method: "DELETE" });
    const result = await res.json().catch(() => ({}));
    setBusyId(null);
    if (!res.ok) {
      setError(result.error ?? (isRTL ? "تعذّر الحذف" : "Couldn't delete"));
      return;
    }
    setTickets((prev) => prev.filter((t) => t.id !== ticketId));
  }

  async function toggleStatus(ticket: TicketType) {
    const nextStatus = ticket.status === "available" ? "sold_out" : "available";
    setBusyId(ticket.id);
    setError(null);
    const res = await fetch(`/api/organizer/events/${eventId}/tickets/${ticket.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    const result = await res.json();
    setBusyId(null);
    if (!res.ok) {
      setError(result.error ?? (isRTL ? "تعذّر التحديث" : "Couldn't update"));
      return;
    }
    setTickets((prev) => prev.map((t) => (t.id === ticket.id ? result : t)));
  }

  return (
    <div className="bg-white rounded-2xl border border-black/5 p-5">
      <h2 className="font-medium text-brand-midnight text-sm mb-4 flex items-center gap-2">
        <Ticket size={15} className="text-brand-gold" />
        {isRTL ? "أنواع التذاكر" : "Ticket Types"}
      </h2>

      {error && <div className="bg-red-50 text-red-600 text-xs px-3 py-2 rounded-lg mb-3">{error}</div>}

      {tickets.length === 0 ? (
        <p className="text-xs text-brand-ink/40 mb-4">{isRTL ? "لا توجد أنواع تذاكر بعد" : "No ticket types yet"}</p>
      ) : (
        <div className="space-y-2 mb-4">
          {tickets.map((tt) => (
            <div key={tt.id} className="flex items-center gap-3 border border-black/5 rounded-xl px-3 py-2.5">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-brand-midnight truncate">{isRTL ? tt.name_ar : tt.name_en}</p>
                <p className="text-xs text-brand-ink/40 mt-0.5">
                  {formatCurrency(tt.price, tt.currency, isRTL ? "ar-SA" : "en-US")} · {tt.sold_quantity}/{tt.total_quantity} {isRTL ? "مباعة" : "sold"}
                </p>
              </div>
              <button
                onClick={() => toggleStatus(tt)}
                disabled={busyId === tt.id}
                className={
                  "text-xs px-2.5 py-1 rounded-full font-medium shrink-0 disabled:opacity-50 " +
                  (tt.status === "available" ? "bg-emerald-500/10 text-emerald-600" : "bg-black/5 text-brand-ink/50")
                }
              >
                {tt.status === "available" ? (isRTL ? "متاحة" : "Available") : (isRTL ? "نفذت" : "Sold out")}
              </button>
              <button
                onClick={() => handleDelete(tt.id)}
                disabled={busyId === tt.id || tt.sold_quantity > 0}
                title={tt.sold_quantity > 0 ? (isRTL ? "لا يمكن حذف تذاكر تم بيعها" : "Can't delete a ticket type with sales") : undefined}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-brand-ink/30 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-30 shrink-0"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="border-t border-black/5 pt-4 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <input
            value={draft.name_ar}
            onChange={(e) => setDraft((d) => ({ ...d, name_ar: e.target.value }))}
            placeholder={isRTL ? "الاسم بالعربية" : "Name (Arabic)"}
            className="text-sm px-3 py-2 rounded-lg border border-black/10 focus:outline-none focus:border-brand-gold"
          />
          <input
            value={draft.name_en}
            onChange={(e) => setDraft((d) => ({ ...d, name_en: e.target.value }))}
            placeholder={isRTL ? "الاسم بالإنجليزية" : "Name (English)"}
            className="text-sm px-3 py-2 rounded-lg border border-black/10 focus:outline-none focus:border-brand-gold"
          />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <input
            type="number"
            min={0}
            step="0.01"
            value={draft.price}
            onChange={(e) => setDraft((d) => ({ ...d, price: e.target.value }))}
            placeholder={isRTL ? "السعر" : "Price"}
            className="text-sm px-3 py-2 rounded-lg border border-black/10 focus:outline-none focus:border-brand-gold"
          />
          <select
            value={draft.currency}
            onChange={(e) => setDraft((d) => ({ ...d, currency: e.target.value }))}
            className="text-sm px-3 py-2 rounded-lg border border-black/10 focus:outline-none focus:border-brand-gold"
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <input
            type="number"
            min={1}
            value={draft.total_quantity}
            onChange={(e) => setDraft((d) => ({ ...d, total_quantity: e.target.value }))}
            placeholder={isRTL ? "الكمية" : "Quantity"}
            className="text-sm px-3 py-2 rounded-lg border border-black/10 focus:outline-none focus:border-brand-gold"
          />
        </div>
        <button
          onClick={handleAdd}
          disabled={adding}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-dashed border-brand-gold/40 text-brand-gold text-sm font-medium hover:bg-brand-gold/5 transition-colors disabled:opacity-50"
        >
          <Plus size={14} />
          {adding ? (isRTL ? "جارٍ الإضافة..." : "Adding...") : isRTL ? "إضافة نوع تذكرة" : "Add ticket type"}
        </button>
      </div>
    </div>
  );
}
