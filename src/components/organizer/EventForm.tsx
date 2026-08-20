"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import TicketTypesManager from "@/components/organizer/TicketTypesManager";
import { EVENT_CATEGORIES as CATEGORIES, EVENT_CATEGORY_LABEL as CATEGORY_LABEL } from "@/lib/constants";

const COUNTRIES = ["SA", "AE", "BH", "KW", "QA"];

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

interface EventData {
  id: string;
  title_ar: string;
  title_en: string;
  description_ar: string | null;
  description_en: string | null;
  cover_image: string | null;
  venue_name: string | null;
  venue_city: string;
  venue_country: string;
  starts_at: string;
  ends_at: string;
  status: string;
  is_free: boolean;
  category: string;
  ticket_types?: TicketType[];
}

function toLocalInput(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function EventForm({
  locale,
  mode,
  initialData,
}: {
  locale: string;
  mode: "create" | "edit";
  initialData?: EventData | null;
}) {
  const router = useRouter();
  const isRTL = locale === "ar";

  const [form, setForm] = useState({
    title_ar: initialData?.title_ar ?? "",
    title_en: initialData?.title_en ?? "",
    description_ar: initialData?.description_ar ?? "",
    description_en: initialData?.description_en ?? "",
    cover_image: initialData?.cover_image ?? "",
    venue_name: initialData?.venue_name ?? "",
    venue_city: initialData?.venue_city ?? "",
    venue_country: initialData?.venue_country ?? "SA",
    starts_at: toLocalInput(initialData?.starts_at),
    ends_at: toLocalInput(initialData?.ends_at),
    category: initialData?.category ?? "conference",
    is_free: initialData?.is_free ?? false,
    status: initialData?.status ?? "draft",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title_ar.trim() || !form.title_en.trim() || !form.venue_city.trim() || !form.starts_at || !form.ends_at) {
      setError(isRTL ? "الرجاء تعبئة الحقول المطلوبة" : "Please fill in all required fields");
      return;
    }

    setSaving(true);
    setError(null);
    setSaved(false);

    const payload = {
      ...form,
      starts_at: new Date(form.starts_at).toISOString(),
      ends_at: new Date(form.ends_at).toISOString(),
    };

    const url = mode === "create" ? "/api/organizer/events" : `/api/organizer/events/${initialData!.id}`;
    const method = mode === "create" ? "POST" : "PATCH";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await res.json();
    setSaving(false);

    if (!res.ok) {
      setError(result.error ?? (isRTL ? "حدث خطأ أثناء الحفظ" : "Something went wrong while saving"));
      return;
    }

    if (mode === "create") {
      router.push(`/${locale}/organizer/events/${result.id}/edit`);
    } else {
      setSaved(true);
      router.refresh();
    }
  }

  const inputClass = "w-full text-sm px-3 py-2.5 rounded-lg border border-black/10 focus:outline-none focus:border-brand-gold";
  const labelClass = "text-xs font-medium text-brand-ink/60 mb-1.5 block";

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-semibold text-brand-midnight">
        {mode === "create" ? (isRTL ? "فعالية جديدة" : "New Event") : isRTL ? "تعديل الفعالية" : "Edit Event"}
      </h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-black/5 p-5 space-y-4">
        {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>}
        {saved && <div className="bg-emerald-50 text-emerald-600 text-sm px-4 py-3 rounded-xl">{isRTL ? "تم الحفظ" : "Saved"}</div>}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>{isRTL ? "العنوان (عربي) *" : "Title (Arabic) *"}</label>
            <input className={inputClass} value={form.title_ar} onChange={(e) => set("title_ar", e.target.value)} dir="rtl" />
          </div>
          <div>
            <label className={labelClass}>{isRTL ? "العنوان (إنجليزي) *" : "Title (English) *"}</label>
            <input className={inputClass} value={form.title_en} onChange={(e) => set("title_en", e.target.value)} dir="ltr" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>{isRTL ? "الوصف (عربي)" : "Description (Arabic)"}</label>
            <textarea className={inputClass} rows={3} value={form.description_ar} onChange={(e) => set("description_ar", e.target.value)} dir="rtl" />
          </div>
          <div>
            <label className={labelClass}>{isRTL ? "الوصف (إنجليزي)" : "Description (English)"}</label>
            <textarea className={inputClass} rows={3} value={form.description_en} onChange={(e) => set("description_en", e.target.value)} dir="ltr" />
          </div>
        </div>

        <div>
          <label className={labelClass}>{isRTL ? "رابط صورة الغلاف" : "Cover image URL"}</label>
          <input className={inputClass} value={form.cover_image} onChange={(e) => set("cover_image", e.target.value)} placeholder="https://..." />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>{isRTL ? "اسم المكان" : "Venue name"}</label>
            <input className={inputClass} value={form.venue_name} onChange={(e) => set("venue_name", e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>{isRTL ? "المدينة *" : "City *"}</label>
            <input className={inputClass} value={form.venue_city} onChange={(e) => set("venue_city", e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>{isRTL ? "الدولة" : "Country"}</label>
            <select className={inputClass} value={form.venue_country} onChange={(e) => set("venue_country", e.target.value)}>
              {COUNTRIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>{isRTL ? "يبدأ في *" : "Starts at *"}</label>
            <input type="datetime-local" className={inputClass} value={form.starts_at} onChange={(e) => set("starts_at", e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>{isRTL ? "ينتهي في *" : "Ends at *"}</label>
            <input type="datetime-local" className={inputClass} value={form.ends_at} onChange={(e) => set("ends_at", e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>{isRTL ? "التصنيف" : "Category"}</label>
            <select className={inputClass} value={form.category} onChange={(e) => set("category", e.target.value)}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{isRTL ? CATEGORY_LABEL[c].ar : CATEGORY_LABEL[c].en}</option>
              ))}
            </select>
          </div>
          {mode === "edit" && (
            <div>
              <label className={labelClass}>{isRTL ? "الحالة" : "Status"}</label>
              <select className={inputClass} value={form.status} onChange={(e) => set("status", e.target.value)}>
                <option value="draft">{isRTL ? "مسودة" : "Draft"}</option>
                <option value="published">{isRTL ? "منشورة" : "Published"}</option>
                <option value="cancelled">{isRTL ? "ملغاة" : "Cancelled"}</option>
                <option value="completed">{isRTL ? "منتهية" : "Completed"}</option>
              </select>
            </div>
          )}
        </div>

        <label className="flex items-center gap-2 text-sm text-brand-ink/70">
          <input type="checkbox" checked={form.is_free} onChange={(e) => set("is_free", e.target.checked)} />
          {isRTL ? "فعالية مجانية" : "This is a free event"}
        </label>

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-brand-midnight text-white py-3 rounded-xl font-medium text-sm hover:bg-brand-ink transition-colors disabled:opacity-50"
        >
          {saving
            ? (isRTL ? "جارٍ الحفظ..." : "Saving...")
            : mode === "create"
            ? (isRTL ? "إنشاء الفعالية" : "Create Event")
            : (isRTL ? "حفظ التغييرات" : "Save Changes")}
        </button>
      </form>

      {mode === "edit" && initialData && (
        <TicketTypesManager eventId={initialData.id} isRTL={isRTL} initialTickets={initialData.ticket_types ?? []} />
      )}
      {mode === "create" && (
        <p className="text-xs text-brand-ink/40 text-center">
          {isRTL ? "يمكنك إضافة أنواع التذاكر بعد إنشاء الفعالية" : "You'll be able to add ticket types once the event is created"}
        </p>
      )}
    </div>
  );
}
