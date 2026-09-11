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

export const VENUE_TYPES = [
  "hotel", "ballroom", "hall", "conference_center", "arena", "stadium",
  "theater", "outdoor", "restaurant", "cultural", "exhibition_center", "other",
] as const;

export type VenueType = (typeof VENUE_TYPES)[number];

export const VENUE_TYPE_LABEL: Record<string, { ar: string; en: string }> = {
  hotel:             { ar: "فندق",           en: "Hotel" },
  ballroom:          { ar: "قاعة احتفالات",  en: "Ballroom" },
  hall:              { ar: "قاعة",           en: "Hall" },
  conference_center: { ar: "مركز مؤتمرات",   en: "Conference Center" },
  arena:             { ar: "صالة رياضية",    en: "Arena" },
  stadium:           { ar: "ملعب",           en: "Stadium" },
  theater:           { ar: "مسرح",           en: "Theater" },
  outdoor:           { ar: "في الهواء الطلق", en: "Outdoor" },
  restaurant:        { ar: "مطعم",           en: "Restaurant" },
  cultural:          { ar: "مركز ثقافي",     en: "Cultural Center" },
  exhibition_center: { ar: "مركز معارض",     en: "Exhibition Center" },
  other:             { ar: "أخرى",           en: "Other" },
};

/**
 * Cities the content agent sweeps. `venue_city` / `venues.city` values
 * are stored exactly as `name` here so filters on the listing pages line
 * up with what the agent writes.
 */
export interface SweepCity {
  name: string;      // canonical English name stored in the DB
  name_ar: string;
  country: "SA" | "AE" | "QA" | "BH" | "KW";
  label: string;     // what the research prompt uses, e.g. "Riyadh, Saudi Arabia"
}

export const KSA_CITIES: SweepCity[] = [
  { name: "Riyadh",  name_ar: "الرياض",        country: "SA", label: "Riyadh, Saudi Arabia" },
  { name: "Jeddah",  name_ar: "جدة",           country: "SA", label: "Jeddah, Saudi Arabia" },
  { name: "Dammam",  name_ar: "الدمام",        country: "SA", label: "Dammam, Saudi Arabia" },
  { name: "Khobar",  name_ar: "الخبر",         country: "SA", label: "Al Khobar, Saudi Arabia" },
  { name: "Makkah",  name_ar: "مكة المكرمة",   country: "SA", label: "Makkah, Saudi Arabia" },
  { name: "Madinah", name_ar: "المدينة المنورة", country: "SA", label: "Madinah, Saudi Arabia" },
];

export const GCC_CITIES: SweepCity[] = [
  { name: "Dubai",       name_ar: "دبي",      country: "AE", label: "Dubai, UAE" },
  { name: "Abu Dhabi",   name_ar: "أبوظبي",   country: "AE", label: "Abu Dhabi, UAE" },
  { name: "Doha",        name_ar: "الدوحة",   country: "QA", label: "Doha, Qatar" },
  { name: "Manama",      name_ar: "المنامة",  country: "BH", label: "Manama, Bahrain" },
  { name: "Kuwait City", name_ar: "الكويت",   country: "KW", label: "Kuwait City, Kuwait" },
];

export const ALL_SWEEP_CITIES: SweepCity[] = [...KSA_CITIES, ...GCC_CITIES];
