// Curated options for the "Plan a Party" wizard. Kept separate from
// src/lib/constants.ts because these are UI selections specific to this one
// flow, not a general taxonomy used elsewhere (unlike EVENT_CATEGORIES /
// VENDOR_CATEGORIES, which this file maps into).

export interface AgeRange {
  key: string;
  en: string;
  ar: string;
}

export const AGE_RANGES: AgeRange[] = [
  { key: "under_2", en: "Under 2", ar: "أقل من سنتين" },
  { key: "2_4",     en: "2–4",     ar: "2–4" },
  { key: "5_7",     en: "5–7",     ar: "5–7" },
  { key: "8_10",    en: "8–10",    ar: "8–10" },
  { key: "11_13",   en: "11–13",   ar: "11–13" },
  { key: "teen",    en: "Teen",    ar: "مراهق" },
];

export interface BudgetLevel {
  key: string;
  en: string;
  ar: string;
}

export const BUDGET_LEVELS: BudgetLevel[] = [
  { key: "budget",  en: "Budget-friendly", ar: "اقتصادية" },
  { key: "mid",     en: "Mid-range",       ar: "متوسطة" },
  { key: "premium", en: "Premium",         ar: "فاخرة" },
];

// `key: null` is the one pseudo-need ("venue") that isn't a vendor category —
// it drives the venues query in the results page instead.
export interface PartyNeed {
  key: string;
  vendorCategory: string | null;
  en: string;
  ar: string;
}

export const PARTY_NEEDS: PartyNeed[] = [
  { key: "venue",              vendorCategory: null,                 en: "Party Venue / Play Center", ar: "قاعة حفلات / مركز ألعاب" },
  { key: "kids-entertainment", vendorCategory: "kids-entertainment", en: "Entertainer / Magician",     ar: "مرفه / ساحر" },
  { key: "bounce-houses",      vendorCategory: "bounce-houses",      en: "Bounce House",               ar: "ألعاب نفخ" },
  { key: "cakes-desserts",     vendorCategory: "cakes-desserts",     en: "Cake & Desserts",             ar: "كيك وحلويات" },
  { key: "catering",           vendorCategory: "catering",           en: "Catering",                    ar: "ضيافة" },
  { key: "decoration",         vendorCategory: "decoration",         en: "Decorations",                 ar: "ديكور" },
  { key: "photography",        vendorCategory: "photography",        en: "Photography",                 ar: "تصوير" },
];

export function ageLabel(key: string, isRTL: boolean): string {
  const a = AGE_RANGES.find((x) => x.key === key);
  return a ? (isRTL ? a.ar : a.en) : key;
}

export function budgetLabel(key: string, isRTL: boolean): string {
  const b = BUDGET_LEVELS.find((x) => x.key === key);
  return b ? (isRTL ? b.ar : b.en) : key;
}

export function needLabel(key: string, isRTL: boolean): string {
  const n = PARTY_NEEDS.find((x) => x.key === key);
  return n ? (isRTL ? n.ar : n.en) : key;
}
