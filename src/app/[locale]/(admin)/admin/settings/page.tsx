"use client";

import { useState, useEffect } from "react";
import { useLocale } from "next-intl";
import { Save, RefreshCw } from "lucide-react";
import { useAdminData } from "@/hooks/useAdminData";

interface PlatformSetting {
  id: string;
  key: string;
  value: Record<string, unknown>;
  description: string | null;
  updated_at: string;
}

interface SettingField {
  key: string;
  label_en: string;
  label_ar: string;
  description_en: string;
  description_ar: string;
  type: "number" | "boolean" | "text" | "email";
  valueKey: string;
}

const SETTING_FIELDS: SettingField[] = [
  {
    key: "commission_rate",
    label_en: "Commission Rate (%)",
    label_ar: "نسبة العمولة (%)",
    description_en: "Platform commission percentage on each booking",
    description_ar: "نسبة عمولة المنصة على كل حجز",
    type: "number",
    valueKey: "percentage",
  },
  {
    key: "max_tickets_per_booking",
    label_en: "Max Tickets per Booking",
    label_ar: "الحد الأقصى للتذاكر لكل حجز",
    description_en: "Maximum number of tickets a user can book at once",
    description_ar: "الحد الأقصى لعدد التذاكر التي يمكن للمستخدم حجزها دفعة واحدة",
    type: "number",
    valueKey: "count",
  },
  {
    key: "maintenance_mode",
    label_en: "Maintenance Mode",
    label_ar: "وضع الصيانة",
    description_en: "Put the platform in maintenance mode (users will see a maintenance page)",
    description_ar: "وضع المنصة في وضع الصيانة (سيرى المستخدمون صفحة الصيانة)",
    type: "boolean",
    valueKey: "enabled",
  },
  {
    key: "new_registrations",
    label_en: "Allow New Registrations",
    label_ar: "السماح بالتسجيلات الجديدة",
    description_en: "Allow new users to register on the platform",
    description_ar: "السماح للمستخدمين الجدد بالتسجيل في المنصة",
    type: "boolean",
    valueKey: "enabled",
  },
  {
    key: "vendor_auto_approve",
    label_en: "Auto-approve Vendors",
    label_ar: "الموافقة التلقائية على الموردين",
    description_en: "Automatically approve new vendor registrations without admin review",
    description_ar: "الموافقة تلقائياً على تسجيلات الموردين الجديدة دون مراجعة المدير",
    type: "boolean",
    valueKey: "enabled",
  },
  {
    key: "event_auto_approve",
    label_en: "Auto-approve Events",
    label_ar: "الموافقة التلقائية على الفعاليات",
    description_en: "Automatically approve new event submissions without admin review",
    description_ar: "الموافقة تلقائياً على الفعاليات الجديدة دون مراجعة المدير",
    type: "boolean",
    valueKey: "enabled",
  },
  {
    key: "support_email",
    label_en: "Support Email",
    label_ar: "البريد الإلكتروني للدعم",
    description_en: "Platform support email address shown to users",
    description_ar: "عنوان البريد الإلكتروني للدعم المعروض للمستخدمين",
    type: "email",
    valueKey: "email",
  },
];

export default function AdminSettingsPage() {
  const locale = useLocale();
  const isRTL = locale === "ar";

  const { data, loading, refetch } = useAdminData<{ settings: PlatformSetting[] }>(
    "/api/admin/settings"
  );

  const [values, setValues] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved]   = useState<string | null>(null);

  useEffect(() => {
    if (!data?.settings) return;
    const map: Record<string, unknown> = {};
    data.settings.forEach((s) => {
      const field = SETTING_FIELDS.find((f) => f.key === s.key);
      if (field) map[s.key] = s.value[field.valueKey];
    });
    setValues(map);
  }, [data]);

  async function saveSetting(field: SettingField) {
    setSaving(field.key);
    try {
      const valueObj: Record<string, unknown> = { [field.valueKey]: values[field.key] };
      await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: field.key, value: valueObj }),
      });
      setSaved(field.key);
      setTimeout(() => setSaved(null), 2000);
      refetch();
    } finally {
      setSaving(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-black/5 p-5 animate-pulse">
            <div className="h-4 bg-[#F0EDE4] rounded w-1/3 mb-2" />
            <div className="h-3 bg-[#F0EDE4] rounded w-2/3 mb-4" />
            <div className="h-10 bg-[#F0EDE4] rounded-xl" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#2C2C2C]">
          {isRTL ? "إعدادات المنصة" : "Platform Settings"}
        </h1>
        <p className="text-sm text-[#2C2C2C]/50 mt-1">
          {isRTL ? "تكوين إعدادات المنصة العامة" : "Configure global platform settings"}
        </p>
      </div>

      <div className="space-y-4">
        {SETTING_FIELDS.map((field) => (
          <div
            key={field.key}
            className="bg-white rounded-2xl border border-black/5 p-5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <label className="block text-sm font-semibold text-[#2C2C2C]">
                  {isRTL ? field.label_ar : field.label_en}
                </label>
                <p className="text-xs text-[#2C2C2C]/50 mt-1">
                  {isRTL ? field.description_ar : field.description_en}
                </p>

                <div className="mt-4">
                  {field.type === "boolean" ? (
                    <label className="flex items-center gap-3 cursor-pointer w-fit">
                      <div
                        onClick={() =>
                          setValues((v) => ({ ...v, [field.key]: !v[field.key] }))
                        }
                        className={`relative w-11 h-6 rounded-full transition-colors ${
                          values[field.key]
                            ? "bg-[#1B4D4D]"
                            : "bg-[#2C2C2C]/20"
                        }`}
                      >
                        <div
                          className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                            values[field.key]
                              ? isRTL ? "translate-x-[-22px]" : "translate-x-[22px]"
                              : isRTL ? "translate-x-[-2px]" : "translate-x-[2px]"
                          }`}
                        />
                      </div>
                      <span className="text-sm text-[#2C2C2C]">
                        {values[field.key]
                          ? (isRTL ? "مفعّل" : "Enabled")
                          : (isRTL ? "معطّل" : "Disabled")}
                      </span>
                    </label>
                  ) : (
                    <input
                      type={field.type}
                      value={String(values[field.key] ?? "")}
                      onChange={(e) =>
                        setValues((v) => ({
                          ...v,
                          [field.key]:
                            field.type === "number"
                              ? Number(e.target.value)
                              : e.target.value,
                        }))
                      }
                      className="w-full max-w-xs px-4 py-2.5 rounded-xl border border-black/10 bg-[#F9F7F4] text-sm text-[#2C2C2C] focus:outline-none focus:ring-2 focus:ring-[#1B4D4D]/20"
                    />
                  )}
                </div>
              </div>

              <button
                onClick={() => saveSetting(field)}
                disabled={saving === field.key}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors shrink-0 ${
                  saved === field.key
                    ? "bg-emerald-50 text-emerald-600"
                    : "bg-[#1B4D4D] text-white hover:bg-[#1B4D4D]/90"
                } disabled:opacity-50`}
              >
                {saving === field.key ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : (
                  <Save size={14} />
                )}
                {saved === field.key
                  ? (isRTL ? "تم الحفظ" : "Saved!")
                  : (isRTL ? "حفظ" : "Save")}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
