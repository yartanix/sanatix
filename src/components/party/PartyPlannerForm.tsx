"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/routing";
import { PartyPopper } from "lucide-react";
import { ALL_SWEEP_CITIES } from "@/lib/constants";
import { AGE_RANGES, BUDGET_LEVELS, PARTY_NEEDS } from "@/lib/party-planner";

export default function PartyPlannerForm({ isRTL }: { isRTL: boolean }) {
  const router = useRouter();
  const [age, setAge] = useState<string>("5_7");
  const [city, setCity] = useState<string>("");
  const [budget, setBudget] = useState<string>("mid");
  const [needs, setNeeds] = useState<Set<string>>(new Set(["venue", "kids-entertainment", "cakes-desserts"]));

  function toggleNeed(key: string) {
    setNeeds((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  function submit() {
    if (!city) return;
    const params = new URLSearchParams({ age, city, budget, needs: Array.from(needs).join(",") });
    router.push(`/plan-a-party?${params.toString()}`);
  }

  return (
    <div className="bg-white rounded-3xl border border-black/5 shadow-[0_18px_40px_-18px_rgba(15,15,20,0.15)] p-6 md:p-8 space-y-7">
      {/* Age */}
      <div>
        <p className="text-sm font-medium text-brand-midnight mb-3">
          {isRTL ? "كم عمر طفلك؟" : "How old is your child?"}
        </p>
        <div className="flex flex-wrap gap-2">
          {AGE_RANGES.map((a) => (
            <button
              key={a.key}
              type="button"
              onClick={() => setAge(a.key)}
              className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                age === a.key
                  ? "bg-brand-midnight text-white border-brand-midnight"
                  : "bg-white text-brand-ink/65 border-black/10 hover:border-brand-gold/50"
              }`}
            >
              {isRTL ? a.ar : a.en}
            </button>
          ))}
        </div>
      </div>

      {/* City */}
      <div>
        <p className="text-sm font-medium text-brand-midnight mb-3">
          {isRTL ? "في أي مدينة؟" : "Which city?"}
        </p>
        <div className="flex flex-wrap gap-2">
          {ALL_SWEEP_CITIES.map((c) => (
            <button
              key={c.name}
              type="button"
              onClick={() => setCity(c.name)}
              className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                city === c.name
                  ? "bg-brand-midnight text-white border-brand-midnight"
                  : "bg-white text-brand-ink/65 border-black/10 hover:border-brand-gold/50"
              }`}
            >
              {isRTL ? c.name_ar : c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Needs */}
      <div>
        <p className="text-sm font-medium text-brand-midnight mb-3">
          {isRTL ? "ماذا تحتاج للحفلة؟" : "What do you need for the party?"}
        </p>
        <div className="flex flex-wrap gap-2">
          {PARTY_NEEDS.map((n) => (
            <button
              key={n.key}
              type="button"
              onClick={() => toggleNeed(n.key)}
              className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                needs.has(n.key)
                  ? "bg-brand-gold/15 text-[#8A5E12] border-brand-gold/50"
                  : "bg-white text-brand-ink/65 border-black/10 hover:border-brand-gold/50"
              }`}
            >
              {isRTL ? n.ar : n.en}
            </button>
          ))}
        </div>
      </div>

      {/* Budget */}
      <div>
        <p className="text-sm font-medium text-brand-midnight mb-3">
          {isRTL ? "ما هي الميزانية؟" : "What's your budget?"}
        </p>
        <div className="flex flex-wrap gap-2">
          {BUDGET_LEVELS.map((b) => (
            <button
              key={b.key}
              type="button"
              onClick={() => setBudget(b.key)}
              className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                budget === b.key
                  ? "bg-brand-midnight text-white border-brand-midnight"
                  : "bg-white text-brand-ink/65 border-black/10 hover:border-brand-gold/50"
              }`}
            >
              {isRTL ? b.ar : b.en}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={submit}
        disabled={!city}
        className="w-full flex items-center justify-center gap-2 bg-gradient-to-br from-brand-gold-light to-brand-gold text-brand-midnight font-semibold py-3.5 rounded-xl text-sm hover:opacity-90 transition-opacity disabled:opacity-40"
      >
        <PartyPopper size={16} />
        {isRTL ? "اعثر على خيارات حفلتي" : "Find my party options"}
      </button>
      {!city && (
        <p className="text-xs text-center text-brand-ink/40 -mt-4">
          {isRTL ? "اختر مدينة للمتابعة" : "Pick a city to continue"}
        </p>
      )}
    </div>
  );
}
