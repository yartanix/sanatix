// Security audit finding: every bilingual search box (events, vendors,
// venues) builds a PostgREST `.or()` filter string by directly
// interpolating the user's raw search text, e.g.
//   query.or(`title_ar.ilike.%${q}%,title_en.ilike.%${q}%`)
// PostgREST's logical-operator grammar treats `,`, `.`, `:`, `(`, and `)`
// inside an unquoted filter value as syntax, not literal characters — so
// a search term containing one of those (most easily just a comma) can
// inject an *additional* filter clause into the `or(...)` the developer
// never intended, rather than being matched against literally. This is
// PostgREST's own documented escaping rule (wrap the value in double
// quotes, escape `"` and `\` inside it), not something supabase-js does
// for you automatically for a hand-built filter string — see
// https://docs.postgrest.org/en/v12/references/api/url_grammar.html
// ("Reserved characters") and, for the real-world version of this exact
// bug, https://github.com/supabase/supabase-js/pull/2529.
//
// buildIlikeOrFilter() is the one place that builds these strings now,
// so every bilingual search endpoint gets the same safe quoting.

/** Escapes a value for safe use inside a double-quoted PostgREST filter
 *  literal: a literal backslash must come first (so it doesn't swallow
 *  the quote-escape that follows), then the double quote itself. */
function escapePostgrestFilterValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

/**
 * Builds a safe `column1.ilike.%term%,column2.ilike.%term%` fragment for
 * Supabase's `.or()`, with the user-supplied term double-quoted and
 * escaped per PostgREST's filter grammar so it can never be read as
 * additional filter syntax (another column, another `or`/`and` branch,
 * etc.) — only ever as a literal substring to match.
 */
export function buildIlikeOrFilter(term: string, columns: readonly [string, ...string[]]): string {
  const safe = escapePostgrestFilterValue(term);
  return columns.map((column) => `${column}.ilike."%${safe}%"`).join(",");
}
