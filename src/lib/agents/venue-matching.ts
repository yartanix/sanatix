/**
 * Name normalization + fuzzy matching used to (a) dedup venues the agent
 * finds against ones already stored, and (b) link events to a venue by
 * their free-text venue_name.
 *
 * Deliberately conservative: a false link (an event shown at the wrong
 * venue) is worse than no link, so we only match on exact normalized
 * equality or clear containment of a reasonably long name.
 */

const NOISE_WORDS = new Set([
  "the", "al", "el", "hotel", "hotels", "riyadh", "jeddah", "dammam", "khobar",
  "dubai", "doha", "manama", "kuwait", "makkah", "madinah", "abu", "dhabi",
  "city", "center", "centre", "and", "&",
]);

export function normalizeName(input: string | null | undefined): string {
  if (!input) return "";
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")     // strip accents
    .replace(/[^a-z0-9؀-ۿ\s]/g, " ") // keep latin, digits, arabic
    .replace(/\s+/g, " ")
    .trim();
}

/** Like normalizeName but drops filler words — used for containment checks. */
export function coreName(input: string | null | undefined): string {
  return normalizeName(input)
    .split(" ")
    .filter((w) => w.length > 1 && !NOISE_WORDS.has(w))
    .join(" ");
}

export interface MatchableVenue {
  id: string;
  name_en: string;
  name_ar: string | null;
  aliases: string[] | null;
}

/**
 * Returns the venue whose name (or alias) matches `candidate`, or null.
 */
export function findVenueMatch(candidate: string | null | undefined, venues: MatchableVenue[]): MatchableVenue | null {
  const n = normalizeName(candidate);
  if (n.length < 3) return null;
  const c = coreName(candidate);

  // Pass 1: exact normalized equality on any name/alias.
  for (const v of venues) {
    const names = [v.name_en, v.name_ar, ...(v.aliases ?? [])];
    if (names.some((x) => normalizeName(x) === n)) return v;
  }

  // Pass 2: containment of the "core" name, only when the core is long
  // enough to be distinctive (avoid "Hall" matching "Grand Hall").
  if (c.length >= 8) {
    for (const v of venues) {
      const names = [v.name_en, v.name_ar, ...(v.aliases ?? [])];
      for (const x of names) {
        const cx = coreName(x);
        if (cx.length >= 8 && (cx.includes(c) || c.includes(cx))) return v;
      }
    }
  }

  return null;
}

/** True when two event titles are close enough to be the same event. */
export function sameEventTitle(a: string, b: string): boolean {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  const ca = coreName(a);
  const cb = coreName(b);
  if (ca.length >= 12 && cb.length >= 12 && (ca.includes(cb) || cb.includes(ca))) return true;
  return false;
}
