"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/routing";
import type { InvitationTemplate } from "@/types";

export default function CreatePartyForm({
  isRTL,
  templates = [],
}: {
  isRTL: boolean;
  templates?: InvitationTemplate[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("17:00");
  const [locationName, setLocationName] = useState("");
  const [locationAddress, setLocationAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Richer invitation config — closes the gap against single-purpose
  // invitation apps (configurable question + entry code + direct
  // WhatsApp/SMS delivery), without touching the plus-one stepper,
  // which already exists on the RSVP form itself.
  const [templateId, setTemplateId] = useState<string | null>(
    templates.find((t) => !t.is_premium)?.id ?? null
  );
  const [allowPlusOnes, setAllowPlusOnes] = useState(true);
  const [customQuestion, setCustomQuestion] = useState("");
  const [requireEntryCode, setRequireEntryCode] = useState(false);
  const [autoSendChannel, setAutoSendChannel] = useState<"none" | "whatsapp" | "sms">("none");

  const canSubmit = title.trim().length > 0 && date.length > 0 && !saving;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    setErrorMsg(null);
    try {
      const startsAt = new Date(`${date}T${time || "17:00"}:00`).toISOString();
      const res = await fetch("/api/parties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          startsAt,
          locationName: locationName.trim() || undefined,
          locationAddress: locationAddress.trim() || undefined,
          notes: notes.trim() || undefined,
          templateId: templateId ?? undefined,
          allowPlusOnes,
          customQuestion: customQuestion.trim() || undefined,
          requireEntryCode,
          autoSendChannel,
        }),
      });
      if (!res.ok) throw new Error("failed");
      const { party } = await res.json();
      router.push(`/parties/${party.id}`);
    } catch {
      setErrorMsg(isRTL ? "تعذر إنشاء الحفلة، حاول مرة أخرى" : "Couldn't create the party — try again");
      setSaving(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-brand-midnight placeholder:text-brand-ink/35 focus:outline-none focus:border-brand-gold/50";
  const labelClass = "block text-xs font-semibold text-brand-ink/60 mb-1.5";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className={labelClass}>{isRTL ? "اسم الحفلة" : "Party title"}</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={isRTL ? "مثال: عيد ميلاد سارة" : "e.g. Sarah's Birthday"}
          className={inputClass}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>{isRTL ? "التاريخ" : "Date"}</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={inputClass}
            required
          />
        </div>
        <div>
          <label className={labelClass}>{isRTL ? "الوقت" : "Time"}</label>
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={inputClass} />
        </div>
      </div>

      <div>
        <label className={labelClass}>{isRTL ? "اسم المكان" : "Location name"}</label>
        <input
          type="text"
          value={locationName}
          onChange={(e) => setLocationName(e.target.value)}
          placeholder={isRTL ? "مثال: منزلنا، قاعة الفرح" : "e.g. Our house, Party Hall"}
          className={inputClass}
        />
      </div>

      <div>
        <label className={labelClass}>{isRTL ? "العنوان" : "Address"}</label>
        <input
          type="text"
          value={locationAddress}
          onChange={(e) => setLocationAddress(e.target.value)}
          placeholder={isRTL ? "العنوان الكامل (اختياري)" : "Full address (optional)"}
          className={inputClass}
        />
      </div>

      <div>
        <label className={labelClass}>{isRTL ? "ملاحظات للضيوف" : "Notes for guests"}</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={isRTL ? "مثال: يرجى إحضار... / كود اللباس..." : "e.g. bring a swimsuit, dress code..."}
          rows={3}
          className={`${inputClass} resize-none`}
        />
      </div>

      {templates.length > 0 && (
        <div>
          <label className={labelClass}>{isRTL ? "تصميم الدعوة" : "Invitation design"}</label>
          <div className="grid grid-cols-3 gap-2">
            {templates.map((t) => {
              const selected = templateId === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  disabled={t.is_premium}
                  onClick={() => setTemplateId(t.id)}
                  className={`relative rounded-xl border px-2 py-3 text-xs font-semibold text-center transition-colors ${
                    selected ? "border-brand-gold ring-2 ring-brand-gold/30" : "border-black/10"
                  } ${t.is_premium ? "opacity-50 cursor-not-allowed" : "hover:bg-brand-sand"}`}
                  style={{ color: t.accent_color }}
                >
                  {isRTL ? t.name_ar : t.name_en}
                  {t.is_premium && (
                    <span className="block mt-1 text-[10px] font-bold text-brand-ink/40">
                      {isRTL ? "قريباً" : "Coming soon"}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div>
        <label className={labelClass}>{isRTL ? "سؤال إضافي للضيوف (اختياري)" : "A question to ask guests (optional)"}</label>
        <input
          type="text"
          value={customQuestion}
          onChange={(e) => setCustomQuestion(e.target.value)}
          placeholder={isRTL ? "مثال: هل لديك حساسية من أي طعام؟" : "e.g. Any food allergies we should know?"}
          className={inputClass}
        />
      </div>

      <div className="flex items-center justify-between rounded-xl border border-black/10 px-4 py-3">
        <span className="text-sm text-brand-midnight">{isRTL ? "السماح بإحضار مرافقين" : "Allow guests to bring plus-ones"}</span>
        <input
          type="checkbox"
          checked={allowPlusOnes}
          onChange={(e) => setAllowPlusOnes(e.target.checked)}
          className="w-5 h-5 accent-brand-gold"
        />
      </div>

      <div className="flex items-center justify-between rounded-xl border border-black/10 px-4 py-3">
        <div>
          <span className="block text-sm text-brand-midnight">{isRTL ? "طلب كود دخول عند الباب" : "Require an entry code at the door"}</span>
          <span className="block text-xs text-brand-ink/45 mt-0.5">
            {isRTL ? "سنولّد كوداً لك تلقائياً" : "We'll generate one for you automatically"}
          </span>
        </div>
        <input
          type="checkbox"
          checked={requireEntryCode}
          onChange={(e) => setRequireEntryCode(e.target.checked)}
          className="w-5 h-5 accent-brand-gold"
        />
      </div>

      <div>
        <label className={labelClass}>{isRTL ? "إرسال الدعوات تلقائياً عبر" : "Auto-send invites via"}</label>
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              { key: "none", en: "Manual share", ar: "مشاركة يدوية" },
              { key: "whatsapp", en: "WhatsApp", ar: "واتساب" },
              { key: "sms", en: "SMS", ar: "رسالة نصية" },
            ] as const
          ).map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setAutoSendChannel(opt.key)}
              className={`rounded-xl border px-2 py-2.5 text-xs font-semibold transition-colors ${
                autoSendChannel === opt.key
                  ? "border-brand-gold bg-brand-sand text-brand-midnight"
                  : "border-black/10 text-brand-ink/55 hover:bg-brand-sand"
              }`}
            >
              {isRTL ? opt.ar : opt.en}
            </button>
          ))}
        </div>
        {autoSendChannel !== "none" && (
          <p className="text-xs text-brand-ink/45 mt-2">
            {isRTL
              ? "سيتم الإرسال فقط للضيوف الذين أدخلت رقم هاتفهم"
              : "Only sent to guests you give a phone number for — you can still share links manually for the rest."}
          </p>
        )}
      </div>

      {errorMsg && <p className="text-sm text-rose-600">{errorMsg}</p>}

      <button
        type="submit"
        disabled={!canSubmit}
        className="w-full py-3.5 rounded-xl bg-gradient-to-br from-brand-gold-light to-brand-gold text-brand-midnight text-sm font-bold disabled:opacity-40 hover:opacity-90 transition-opacity"
      >
        {saving ? (isRTL ? "جارٍ الإنشاء..." : "Creating...") : isRTL ? "إنشاء الحفلة ومتابعة الدعوات" : "Create party & invite guests"}
      </button>
    </form>
  );
}
