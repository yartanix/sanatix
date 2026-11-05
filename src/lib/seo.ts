import type { Metadata } from "next";
import { SITE_URL } from "@/lib/constants";

/**
 * Builds a Metadata object with canonical + hreflang alternates wired up
 * correctly for a given locale-prefixed path, plus matching OpenGraph /
 * Twitter card fields. Centralizing this means every page gets the same
 * SEO plumbing instead of re-deriving alternate-locale URLs by hand.
 *
 * `path` is the locale-free path (e.g. "/events/123"). Both locales live
 * under the same path with a locale prefix — see src/i18n/routing.ts.
 */
export function buildMetadata({
  path,
  locale,
  title,
  description,
  image,
  type = "website",
}: {
  path: string;
  locale: string;
  title: string;
  description: string;
  image?: string | null;
  type?: "website" | "article";
}): Metadata {
  // locale prefix is "as-needed": Arabic (default locale) has no prefix,
  // English is served under /en — see src/i18n/routing.ts.
  const cleanPath = path === "/" ? "" : path;
  const arUrl = `${SITE_URL}${cleanPath}` || SITE_URL;
  const enUrl = `${SITE_URL}/en${cleanPath}`;
  const canonical = locale === "ar" ? arUrl : enUrl;
  const ogImages = image ? [{ url: image }] : undefined;

  return {
    title,
    description,
    alternates: {
      canonical,
      languages: {
        ar: arUrl,
        en: enUrl,
        "x-default": enUrl,
      },
    },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: "Sanatix",
      locale: locale === "ar" ? "ar_SA" : "en_US",
      alternateLocale: locale === "ar" ? "en_US" : "ar_SA",
      type,
      images: ogImages,
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      images: ogImages?.map((i) => i.url),
    },
  };
}

/** Strips HTML-unsafe characters and trims a description to a sane SEO length. */
export function trimDescription(text: string | null | undefined, max = 160): string {
  if (!text) return "";
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max - 1).trimEnd()}…` : flat;
}

/**
 * Renders a JSON-LD <script> tag. Pass any schema.org-shaped object.
 *
 * Security audit fix: this data includes user-controlled text — event
 * title/description, a venue/vendor name, an organizer's own
 * profiles.full_name — none of which is HTML-escaped anywhere upstream
 * (there's no requirement today that these fields avoid `<`). Plain
 * `JSON.stringify()` escapes quotes but NOT `/`, so a value containing
 * the literal text `</script>` would close the real <script> tag early
 * when rendered via dangerouslySetInnerHTML, letting whatever HTML
 * follows it in the same string execute as a new, attacker-controlled
 * <script> in the page — a stored XSS reachable by any organizer
 * editing their own event, or any user editing their own profile name,
 * against every visitor who views that page. Escaping every `<` as its
 * unicode escape (valid, semantically identical JSON — parses back to
 * the same string) means a literal `</script>` can never appear in the
 * emitted HTML, closing this off regardless of what text content ends
 * up in here.
 */
export function jsonLd(data: Record<string, unknown>) {
  return {
    __html: JSON.stringify(data).replace(/</g, "\\u003c"),
  };
}
