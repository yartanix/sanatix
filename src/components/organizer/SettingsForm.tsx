"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Profile {
  full_name?: string | null;
  phone?: string | null;
  city?: string | null;
  locale?: "ar" | "en";
}

export default function SettingsForm({
  locale,
  initialData,
  email,
}: {
  locale: string;
  initialData: Profile;
  email: string;
}) {
  const router = useRouter();
  const isRTL = locale === "ar";

  const [form, setForm] = useState({
    full_name: initialData.full_name ?? "",
    phone: initialData.phone ?? "",
    city: initialData.city ?? "",
    locale: initialData.locale ?? locale,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);

    const res = await fetch("/api/organizer/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const result = await res.json();
    setSaving(false);

    if (!res.ok) {
      setError(result.error ?? (isRTL ? "حدث خطأ أثناء الحفظ" : "Something went wrong while saving"));
      return;
    }
    setSaved(true);
    router.refresh();
  }

  const inputClass = "w-full text-sm px-3 py-2.5 rounded-lg border border-black/10 focus:outline-none focus:border-brand-gold";
  const labelClass = "text-xs font-medium text-brand-ink/60 mb-1.5 block";

  return (
    <div className="space-y-6 max-w-lg">
      <h1 className="text-2xl font-semibold text-brand-midnight">{isRTL ? "الإعدادات" : "Settings"}</h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-black/5 p-5 space-y-4">
        {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>}
        {saved && <div className="bg-emerald-50 text-emerald-600 text-sm px-4 py-3 rounded-xl">{isRTL ? "تم الحفظ" : "Saved"}</div>}

        <div>
          <label className={labelClass}>{isRTL ? "البريد الإلكتروني" : "Email"}</label>
          <input className={inputClass} value={email} disabled />
        </div>

        <div>
          <label className={labelClass}>{isRTL ? "الاسم الكامل" : "Full name"}</label>
          <input
            className={inputClass}
            value={form.full_name}
            onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
          />
        </div>

        <div>
          <label className={labelClass}>{isRTL ? "رقم الهاتف" : "Phone"}</label>
          <input
            className={inputClass}
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            placeholder="+966 5xxxxxxxx"
          />
        </div>

        <div>
          <label className={labelClass}>{isRTL ? "المدينة" : "City"}</label>
          <input
            className={inputClass}
            value={form.city}
            onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
          />
        </div>

        <div>
          <label className={labelClass}>{isRTL ? "لغة الواجهة" : "Interface language"}</label>
          <select
            className={inputClass}
            value={form.locale}
            onChange={(e) => setForm((f) => ({ ...f, locale: e.target.value }))}
          >
            <option value="ar">العربية</option>
            <option value="en">English</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-brand-midnight text-white py-3 rounded-xl font-medium text-sm hover:bg-brand-ink transition-colors disabled:opacity-50"
        >
          {saving ? (isRTL ? "جارٍ الحفظ..." : "Saving...") : isRTL ? "حفظ التغييرات" : "Save Changes"}
        </button>
      </form>
    </div>
  );
}
