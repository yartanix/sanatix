"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/routing";
import { PartyPopper } from "lucide-react";

// Step 1 of the "Plan your party" journey: the very first thing a
// visitor sees after clicking the homepage CTA. Everything downstream
// (preferences, venue/location, review) is reached only by continuing
// from here, so this step's two answers (what + when) travel forward
// as query params rather than being asked again later.
export default function OccasionStepForm({ isRTL }: { isRTL: boolean }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("17:00");

  const canContinue = title.trim().length > 0 && date.length > 0;

  function submit() {
    if (!canContinue) return;
    const params = new URLSearchParams({ title: title.trim(), date, time: time || "17:00" });
    router.push(`/plan-a-party?${params.toString()}`);
  }

  const inputClass =
    "w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-brand-midnight placeholder:text-brand-ink/35 focus:outline-none focus:border-brand-gold/50";
  const labelClass = "block text-xs font-semibold text-brand-ink/60 mb-1.5";

  return (
    <div className="bg-white rounded-3xl border border-black/5 shadow-[0_18px_40px_-18px_rgba(15,15,20,0.15)] p-6 md:p-8 space-y-5">
      <div>
        <label className={labelClass}>{isRTL ? "ما اسم المناسبة؟" : "What's the occasion?"}</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={isRTL ? "مثال: عيد ميلاد سارة" : "e.g. Sarah's Birthday"}
          className={inputClass}
          autoFocus
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>{isRTL ? "التاريخ" : "Date"}</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>{isRTL ? "الوقت" : "Time"}</label>
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={inputClass} />
        </div>
      </div>

      <button
        onClick={submit}
        disabled={!canContinue}
        className="w-full flex items-center justify-center gap-2 bg-gradient-to-br from-brand-gold-light to-brand-gold text-brand-midnight font-semibold py-3.5 rounded-xl text-sm hover:opacity-90 transition-opacity disabled:opacity-40"
      >
        <PartyPopper size={16} />
        {isRTL ? "متابعة" : "Continue"}
      </button>
      {!canContinue && (
        <p className="text-xs text-center text-brand-ink/40 -mt-2">
          {isRTL ? "أدخل اسم المناسبة والتاريخ للمتابعة" : "Add a name and a date to continue"}
        </p>
      )}
    </div>
  );
}
