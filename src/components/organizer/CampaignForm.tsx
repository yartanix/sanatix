"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CrowdfundingCampaign } from "@/types";

const CURRENCIES = ["SAR", "AED", "KWD", "QAR", "USD"] as const;

export default function CampaignForm({
  isRTL,
  initialData,
}: {
  isRTL: boolean;
  initialData?: Partial<CrowdfundingCampaign>;
}) {
  const router = useRouter();
  const isEdit = Boolean(initialData?.id);
  const [form, setForm] = useState({
    title_ar: initialData?.title_ar ?? "",
    title_en: initialData?.title_en ?? "",
    description_ar: initialData?.description_ar ?? "",
    description_en: initialData?.description_en ?? "",
    goal_amount: initialData?.goal_amount ?? 0,
    currency: initialData?.currency ?? "SAR",
    deadline: initialData?.deadline ? initialData.deadline.slice(0, 10) : "",
    cover_image: initialData?.cover_image ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function field<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const url = isEdit ? `/api/organizer/campaigns/${initialData!.id}` : "/api/organizer/campaigns";
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, deadline: new Date(form.deadline).toISOString() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to save");
      }
      router.push("/organizer/campaigns");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  const inputClass = "w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-sm text-brand-midnight focus:outline-none focus:border-brand-gold/50";
  const labelClass = "text-xs font-medium text-brand-ink/60 mb-1.5 block";

  return (
    <form onSubmit={submit} className="max-w-2xl space-y-6">
      <h1 className="text-xl font-semibold text-brand-midnight">
        {isEdit ? (isRTL ? "تعديل الحملة" : "Edit Campaign") : (isRTL ? "حملة جديدة" : "New Campaign")}
      </h1>

      {error && <div className="text-sm text-rose-600 bg-rose-50 rounded-xl px-4 py-2.5">{error}</div>}

      <div className="bg-white rounded-2xl border border-black/5 p-6 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>{isRTL ? "العنوان (عربي)" : "Title (Arabic)"}</label>
            <input className={inputClass} required value={form.title_ar} onChange={(e) => field("title_ar", e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>{isRTL ? "العنوان (إنجليزي)" : "Title (English)"}</label>
            <input className={inputClass} required value={form.title_en} onChange={(e) => field("title_en", e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>{isRTL ? "الوصف (عربي)" : "Description (Arabic)"}</label>
            <textarea className={inputClass} rows={3} value={form.description_ar} onChange={(e) => field("description_ar", e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>{isRTL ? "الوصف (إنجليزي)" : "Description (English)"}</label>
            <textarea className={inputClass} rows={3} value={form.description_en} onChange={(e) => field("description_en", e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>{isRTL ? "الهدف" : "Goal amount"}</label>
            <input type="number" min={1} className={inputClass} required value={form.goal_amount} onChange={(e) => field("goal_amount", Number(e.target.value))} />
          </div>
          <div>
            <label className={labelClass}>{isRTL ? "العملة" : "Currency"}</label>
            <select className={inputClass} value={form.currency} onChange={(e) => field("currency", e.target.value as typeof CURRENCIES[number])}>
              {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>{isRTL ? "الموعد النهائي" : "Deadline"}</label>
            <input type="date" className={inputClass} required value={form.deadline} onChange={(e) => field("deadline", e.target.value)} />
          </div>
        </div>

        <div>
          <label className={labelClass}>{isRTL ? "رابط صورة الغلاف" : "Cover image URL"}</label>
          <input className={inputClass} value={form.cover_image} onChange={(e) => field("cover_image", e.target.value)} />
        </div>
      </div>

      <button
        type="submit"
        disabled={saving}
        className="px-5 py-2.5 bg-brand-gold text-white text-sm font-medium rounded-xl hover:bg-brand-gold/90 disabled:opacity-50"
      >
        {saving ? (isRTL ? "جارٍ الحفظ..." : "Saving...") : (isRTL ? "حفظ" : "Save")}
      </button>
    </form>
  );
}
