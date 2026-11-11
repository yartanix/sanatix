"use client";

import { useState } from "react";
import { VENDOR_CATEGORIES, VENDOR_CATEGORY_LABEL } from "@/lib/constants";
import type { Vendor } from "@/types";
import { Save, Check, BadgeCheck } from "lucide-react";

export default function VendorProfileForm({
  locale,
  initialData,
}: {
  locale: string;
  initialData: Vendor | null;
}) {
  const isRTL = locale === "ar";
  const [form, setForm] = useState({
    name_ar: initialData?.name_ar ?? "",
    name_en: initialData?.name_en ?? "",
    description_ar: initialData?.description_ar ?? "",
    description_en: initialData?.description_en ?? "",
    category: initialData?.category ?? VENDOR_CATEGORIES[0],
    city: initialData?.city ?? "",
    instagram_url: initialData?.instagram_url ?? "",
    whatsapp: initialData?.whatsapp ?? "",
    website_url: initialData?.website_url ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!initialData) {
    return (
      <div className="max-w-xl bg-white rounded-2xl border border-black/5 p-8 text-center">
        <p className="text-sm text-brand-ink/50">
          {isRTL ? "لا يوجد ملف تجاري مرتبط بحسابك." : "No vendor profile is linked to your account."}
        </p>
      </div>
    );
  }

  function field<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/vendor/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to save");
      }
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-sm text-brand-midnight focus:outline-none focus:border-brand-gold/50";
  const labelClass = "text-xs font-medium text-brand-ink/60 mb-1.5 block";

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-brand-midnight">
            {isRTL ? "الملف التجاري" : "Vendor Profile"}
          </h1>
          <div className="flex items-center gap-1.5 mt-1 text-xs text-brand-ink/50">
            {initialData.is_verified ? (
              <>
                <BadgeCheck size={13} className="text-emerald-500" />
                {isRTL ? "موثّق" : "Verified"}
              </>
            ) : (
              isRTL ? "قيد مراجعة فريق سناتيكس" : "Pending Sanatix team review"
            )}
          </div>
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-gold text-white text-sm font-medium rounded-xl hover:bg-brand-gold/90 transition-colors disabled:opacity-50"
        >
          {saved ? <Check size={14} /> : <Save size={14} />}
          {saving ? (isRTL ? "جارٍ الحفظ..." : "Saving...") : saved ? (isRTL ? "تم الحفظ" : "Saved") : (isRTL ? "حفظ" : "Save")}
        </button>
      </div>

      {error && <div className="text-sm text-rose-600 bg-rose-50 rounded-xl px-4 py-2.5">{error}</div>}

      <div className="bg-white rounded-2xl border border-black/5 p-6 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>{isRTL ? "الاسم (عربي)" : "Name (Arabic)"}</label>
            <input className={inputClass} value={form.name_ar} onChange={(e) => field("name_ar", e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>{isRTL ? "الاسم (إنجليزي)" : "Name (English)"}</label>
            <input className={inputClass} value={form.name_en} onChange={(e) => field("name_en", e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>{isRTL ? "الوصف (عربي)" : "Description (Arabic)"}</label>
            <textarea className={inputClass} rows={3} value={form.description_ar ?? ""} onChange={(e) => field("description_ar", e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>{isRTL ? "الوصف (إنجليزي)" : "Description (English)"}</label>
            <textarea className={inputClass} rows={3} value={form.description_en ?? ""} onChange={(e) => field("description_en", e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>{isRTL ? "التصنيف" : "Category"}</label>
            <select className={inputClass} value={form.category} onChange={(e) => field("category", e.target.value)}>
              {VENDOR_CATEGORIES.map((c) => (
                <option key={c} value={c}>{isRTL ? VENDOR_CATEGORY_LABEL[c].ar : VENDOR_CATEGORY_LABEL[c].en}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>{isRTL ? "المدينة" : "City"}</label>
            <input className={inputClass} value={form.city} onChange={(e) => field("city", e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>WhatsApp</label>
            <input className={inputClass} value={form.whatsapp ?? ""} onChange={(e) => field("whatsapp", e.target.value)} placeholder="+9665XXXXXXXX" />
          </div>
          <div>
            <label className={labelClass}>Instagram</label>
            <input className={inputClass} value={form.instagram_url ?? ""} onChange={(e) => field("instagram_url", e.target.value)} />
          </div>
        </div>

        <div>
          <label className={labelClass}>{isRTL ? "الموقع الإلكتروني" : "Website"}</label>
          <input className={inputClass} value={form.website_url ?? ""} onChange={(e) => field("website_url", e.target.value)} />
        </div>
      </div>
    </div>
  );
}
