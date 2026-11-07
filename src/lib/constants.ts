// Canonical site origin — used for metadata, sitemap, canonical/hreflang
// tags, and JSON-LD. Keep in sync with the production domain.
export const SITE_URL = "https://sanatix.net";

// Shared taxonomy used by both the organizer event form and the public
// events listing/filtering, so filter chips always match real event data.
// Kids' parties and family events lead this list on purpose — they're the
// platform's primary focus. Concerts/conferences (mostly under
// "entertainment" and "conference") are kept as real, bookable categories,
// just no longer what the homepage and default filters lead with.
export const EVENT_CATEGORIES = [
  "kids_party", "family", "wedding", "entertainment",
  "exhibition", "sports", "community", "corporate", "conference",
] as const;

export const EVENT_CATEGORY_LABEL: Record<string, { ar: string; en: string }> = {
  kids_party:    { ar: "حفلات أطفال", en: "Kids' Parties" },
  family:        { ar: "عائلية",      en: "Family Events" },
  wedding:       { ar: "أعراس",       en: "Weddings" },
  entertainment: { ar: "ترفيه",       en: "Entertainment" },
  exhibition:    { ar: "معارض",       en: "Exhibitions" },
  sports:        { ar: "رياضة",       en: "Sports" },
  community:     { ar: "مجتمعية",     en: "Community Events" },
  corporate:     { ar: "شركات",       en: "Corporate Events" },
  conference:    { ar: "مؤتمرات",     en: "Conferences" },
};

// Vendors don't have a real onboarding flow yet, so there's no live data to
// derive this from — kept as a reasonable placeholder taxonomy for the
// filter chips until a supplier registration form exists. Kids'-party
// vendor types lead the list for the same reason the event categories do.
// Existing slugs (catering, decoration, etc.) are kept as-is rather than
// renamed, since live vendor rows already use them.
export const VENDOR_CATEGORIES = [
  "kids-entertainment", "bounce-houses", "cakes-desserts", "venue",
  "catering", "decoration", "entertainment", "photography",
  "flowers", "sound-lighting", "transport", "printing",
] as const;

export const VENDOR_CATEGORY_LABEL: Record<string, { ar: string; en: string }> = {
  "kids-entertainment": { ar: "ترفيه أطفال",     en: "Kids' Entertainment" },
  "bounce-houses":      { ar: "ألعاب نفخ",        en: "Bounce Houses" },
  "cakes-desserts":     { ar: "كيك وحلويات",      en: "Cakes & Desserts" },
  venue:                { ar: "قاعات",            en: "Venues" },
  catering:             { ar: "ضيافة",            en: "Catering" },
  decoration:           { ar: "ديكور",            en: "Decoration" },
  entertainment:        { ar: "ترفيه",            en: "Entertainment" },
  photography:          { ar: "تصوير",            en: "Photography" },
  flowers:              { ar: "ورد",              en: "Flowers" },
  "sound-lighting":     { ar: "صوت وإضاءة",       en: "Sound & Lighting" },
  transport:            { ar: "نقل",              en: "Transport" },
  printing:             { ar: "طباعة",            en: "Printing" },
};

export const VENUE_TYPES = [
  "kids_play_center", "hotel", "ballroom", "hall", "conference_center", "arena", "stadium",
  "theater", "outdoor", "restaurant", "cultural", "exhibition_center", "other",
] as const;

export type VenueType = (typeof VENUE_TYPES)[number];

export const VENUE_TYPE_LABEL: Record<string, { ar: string; en: string }> = {
  kids_play_center:  { ar: "مركز ألعاب أطفال", en: "Kids' Play Center" },
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
  country: "SA" | "AE" | "QA" | "BH" | "KW" | "OM";
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
  // Completes GCC coverage — Bahrain (a smaller market) was already swept,
  // so leaving Oman out looked like an oversight rather than a deliberate
  // scope cut. Weekly-only sweep, same as the rest of GCC_CITIES, so this
  // adds ~1 extra job to the once-a-week GCC run, not the daily KSA one.
  { name: "Muscat",      name_ar: "مسقط",     country: "OM", label: "Muscat, Oman" },
];

export const ALL_SWEEP_CITIES: SweepCity[] = [...KSA_CITIES, ...GCC_CITIES];
