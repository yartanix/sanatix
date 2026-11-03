"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/routing";

export default function CreatePartyForm({ isRTL }: { isRTL: boolean }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("17:00");
  const [locationName, setLocationName] = useState("");
  const [locationAddress, setLocationAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
