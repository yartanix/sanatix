// Shared taxonomy used by both the organizer event form and the public
// events listing/filtering, so filter chips always match real event data.
export const EVENT_CATEGORIES = [
  "conference", "wedding", "exhibition", "sports",
  "entertainment", "family", "community", "corporate",
] as const;

export const EVENT_CATEGORY_LABEL: Record<string, { ar: string; en: string }> = {
  conference:    { ar: "مؤتمرات",   en: "Conferences" },
  wedding:       { ar: "أعراس",     en: "Weddings" },
  exhibition:    { ar: "معارض",     en: "Exhibitions" },
  sports:        { ar: "رياضة",     en: "Sports" },
  entertainment: { ar: "ترفيه",     en: "Entertainment" },
  family:        { ar: "عائلية",    en: "Family Events" },
  community:     { ar: "مجتمعية",   en: "Community Events" },
  corporate:     { ar: "شركات",     en: "Corporate Events" },
};

// Vendors don't have a real onboarding flow yet, so there's no live data to
// derive this from — kept as a reasonable placeholder taxonomy for the
// filter chips until a supplier registration form exists.
export const VENDOR_CATEGORIES = [
  "catering", "photography", "decoration", "sound-lighting",
  "venue", "entertainment", "flowers", "transport", "printing",
] as const;

export const VENDOR_CATEGORY_LABEL: Record<string, { ar: string; en: string }> = {
  catering:        { ar: "ضيافة",         en: "Catering" },
  photography:     { ar: "تصوير",         en: "Photography" },
  decoration:      { ar: "ديكور",         en: "Decoration" },
  "sound-lighting": { ar: "صوت وإضاءة",   en: "Sound & Lighting" },
  venue:           { ar: "قاعات",         en: "Venues" },
  entertainment:   { ar: "ترفيه",         en: "Entertainment" },
  flowers:         { ar: "ورد",           en: "Flowers" },
  transport:       { ar: "نقل",           en: "Transport" },
  printing:        { ar: "طباعة",         en: "Printing" },
};
