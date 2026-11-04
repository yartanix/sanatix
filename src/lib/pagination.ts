// Security audit finding: every public listing route (/api/events,
// /api/vendors, /api/venues, /api/organizer/events,
// /api/organizer/events/[id]/attendees) parsed `page`/`limit` straight
// from the query string with no bounds — `?limit=999999999` (or a
// negative value) was passed directly into `.range()`. Not a data leak
// (RLS/the route's own filters still decide which rows are visible
// either way) but an easy, free resource-exhaustion knob: one request
// could ask Postgres/PostgREST to materialize an unbounded result set.
// clampPagination() is the one place that turns raw query-string values
// into a safe, bounded {page, limit, offset} for every listing route.
export function clampPagination(
  rawPage: string | null,
  rawLimit: string | null,
  options: { defaultLimit: number; maxLimit: number }
): { page: number; limit: number; offset: number } {
  const parsedPage = Number.parseInt(rawPage ?? "", 10);
  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;

  const parsedLimit = Number.parseInt(rawLimit ?? "", 10);
  const limit =
    Number.isFinite(parsedLimit) && parsedLimit > 0
      ? Math.min(parsedLimit, options.maxLimit)
      : options.defaultLimit;

  return { page, limit, offset: (page - 1) * limit };
}
