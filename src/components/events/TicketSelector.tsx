"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/client";
import { Minus, Plus, Ticket, Lock } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface TicketType {
  id: string;
  name_ar: string;
  name_en: string;
  description_ar: string | null;
  description_en: string | null;
  price: number;
  currency: string;
  total_quantity: number;
  sold_quantity: number;
  status: string;
}

interface TicketSelectorProps {
  eventId: string;
  ticketTypes: TicketType[];
  isFree: boolean;
  locale: string;
}

export default function TicketSelector({ eventId, ticketTypes, isFree, locale }: TicketSelectorProps) {
  const t = useTranslations();
  const router = useRouter();
  const supabase = createClient();
  const isRTL = locale === "ar";

  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableTickets = ticketTypes.filter(tt => tt.status === "available" && tt.sold_quantity < tt.total_quantity);

  function updateQuantity(ticketId: string, delta: number) {
    setQuantities(prev => {
      const current = prev[ticketId] ?? 0;
      const newVal = Math.max(0, Math.min(10, current + delta));
      return { ...prev, [ticketId]: newVal };
    });
  }

  const totalItems = Object.values(quantities).reduce((a, b) => a + b, 0);
  const totalAmount = availableTickets.reduce((sum, tt) => sum + (quantities[tt.id] ?? 0) * tt.price, 0);
  const currency = availableTickets[0]?.currency ?? "SAR";

  async function handleBooking() {
    if (totalItems === 0) return;
    setLoading(true);
    setError(null);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    const items = Object.entries(quantities)
      .filter(([, quantity]) => quantity > 0)
      .map(([ticket_type_id, quantity]) => ({ ticket_type_id, quantity }));

    // Booking is created server-side via /api/bookings, which locks the
    // ticket_type row and checks remaining stock atomically — this avoids
    // overselling when two people book the same last tickets at once.
    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });
    const result = await res.json();

    if (!res.ok) {
      setError(result.error ?? "Booking failed");
      setLoading(false);
      return;
    }

    router.push(`/bookings/${result.bookings[0].id}/confirm`);
  }

  if (ticketTypes.length === 0) return (<div className="bg-white rounded-2xl border border-black/5 p-6 text-center"><Ticket size={32} className="text-brand-ink/20 mx-auto mb-3" /><p className="text-sm text-brand-ink/50">{isRTL ? "ةلتذاكر غير متاحة" : "No tickets available yet"}</p></div>);

  return (<div className="bg-white rounded-2xl border border-black/5 overflow-hidden"><div className="p-5 border-b border-black/5"><h3 className="font-medium text-brand-midnight text-base">{isRTL ? "ةاحجز تذكرتك" : "Book your tickets"}</h3>{isFree && (<span className="text-xs bg-green-50 text-green-600 px-2.5 py-1 rounded-full mt-1 inline-block">{t("events.free")}</span>)}</div><div className="p-5 space-y-4">{error && (<div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>)}{availableTickets.map((tt) => { const name = locale === "ar" ? tt.name_ar : tt.name_en; const qty = quantities[tt.id] ?? 0; const remaining = tt.total_quantity - tt.sold_quantity; return (<div key={tt.id} className="flex items-center justify-between gap-4 py-3 border-b border-black/5 last:border-0"><div className="flex-1 min-w-0"><p className="text-sm font-medium text-brand-midnight truncate">{name}</p><p className="text-sm font-medium text-brand-gold mt-1">{tt.price === 0 ? t("events.free") : formatCurrency(tt.price, tt.currency, locale === "ar" ? "ar-SA" : "en-US")}</p></div><div className="flex items-center gap-2 shrink-0"><button onClick={() => updateQuantity(tt.id, -1)} disabled={qty === 0} className="w-8 h-8 rounded-lg border border-black/10 flex items-center justify-center text-brand-ink/70 hover:bg-brand-sand transition-colors disabled:opacity-30"><Minus size={14} /></button><span className="w-6 text-center text-sm font-medium text-brand-midnight">{qty}</span><button onClick={() => updateQuantity(tt.id, 1)} disabled={qty >= Math.min(10, remaining)} className="w-8 h-8 rounded-lg border border-black/10 flex items-center justify-center text-brand-ink/70 hover:bg-brand-sand transition-colors disabled:opacity-30"><Plus size={14} /></button></div></div>);})}</div><div className="p-5 bg-brand-sand/40 border-t border-black/5">{totalItems > 0 && (<div className="flex items-center justify-between mb-4"><span className="text-sm text-brand-ink/60">{isRTL ? `${totalItems} تذكرة` : `${totalItems} ticket${totalItems > 1 ? "s" : ""}`}</span><span className="text-base font-medium text-brand-midnight">{totalAmount === 0 ? t("events.free") : formatCurrency(totalAmount, currency, locale === "ar" ? "ar-SA" : "en-US")}</span></div>)}<button onClick={handleBooking} disabled={totalItems === 0 || loading} className="w-full bg-brand-midnight text-brand-warm-white py-3.5 rounded-xl font-medium text-sm hover:bg-brand-ink transition-colors disabled:opacity-40 flex items-center justify-center gap-2">{loading ? (<span>{t("common.loading")}</span>) : (<><Lock size={14} />{totalItems === 0 ? (isRTL ? "اختر تذاكرك" : "Select tickets") : (isRTL ? "ةاحجز الةن" : t("events.bookNow"))}</>)}</button><p className="text-xs text-brand-ink/40 text-center mt-3 flex items-center justify-center gap-1"><Lock size={10} />{isRTL ? "حجز آمن ومز مضمون" : "Secure booking"}</p></div></div>);}
