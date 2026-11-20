// Minimal RFC 5545 (iCalendar) VEVENT generator. No dependency pulled in for
// this — the format is small and stable, and every mail/calendar client
// (Apple Calendar, Google Calendar, Outlook) accepts a single-VEVENT .ics
// file as an "Add to Calendar" action, which is the real, documented
// integration surface third-party apps have (Apple's own "Invites" app has
// no public API — see the research note in the PR this shipped with).

export interface IcsEventInput {
  /** Stable, globally-unique id for this event occurrence (e.g. `party-<id>@sanatix.net`). */
  uid: string;
  title: string;
  /** ISO 8601 / parseable date string. */
  startsAt: string;
  /** ISO 8601 / parseable date string. Defaults to startsAt + 3 hours when omitted. */
  endsAt?: string | null;
  location?: string | null;
  description?: string | null;
  url?: string | null;
}

function toIcsUtc(date: Date): string {
  // YYYYMMDDTHHMMSSZ
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

// RFC 5545 §3.3.11: escape backslash, semicolon, comma, then turn real
// newlines into the literal two-char "\n" escape sequence.
function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

// Long lines must be "folded" at 75 octets with a leading space on the
// continuation line, per RFC 5545 §3.1. Most clients tolerate unfolded
// lines, but folding keeps us correct for strict parsers (older Outlook).
function foldLine(line: string): string {
  if (line.length <= 75) return line;
  const chunks: string[] = [];
  let rest = line;
  while (rest.length > 75) {
    chunks.push(rest.slice(0, 75));
    rest = " " + rest.slice(75);
  }
  chunks.push(rest);
  return chunks.join("\r\n");
}

export function buildIcsEvent(input: IcsEventInput): string {
  const start = new Date(input.startsAt);
  const end = input.endsAt ? new Date(input.endsAt) : new Date(start.getTime() + 3 * 60 * 60 * 1000);
  const now = new Date();

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Sanatix//RSVP//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${escapeIcsText(input.uid)}`,
    `DTSTAMP:${toIcsUtc(now)}`,
    `DTSTART:${toIcsUtc(start)}`,
    `DTEND:${toIcsUtc(end)}`,
    `SUMMARY:${escapeIcsText(input.title)}`,
  ];

  if (input.description) lines.push(`DESCRIPTION:${escapeIcsText(input.description)}`);
  if (input.location) lines.push(`LOCATION:${escapeIcsText(input.location)}`);
  if (input.url) lines.push(`URL:${escapeIcsText(input.url)}`);

  lines.push("END:VEVENT", "END:VCALENDAR");

  // RFC 5545 requires CRLF line endings.
  return lines.map(foldLine).join("\r\n") + "\r\n";
}

/** Builds a "https://calendar.google.com/calendar/render?action=TEMPLATE..." link. */
export function buildGoogleCalendarUrl(input: IcsEventInput): string {
  const start = new Date(input.startsAt);
  const end = input.endsAt ? new Date(input.endsAt) : new Date(start.getTime() + 3 * 60 * 60 * 1000);
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: input.title,
    dates: `${fmt(start)}/${fmt(end)}`,
  });
  if (input.description) params.set("details", input.description);
  if (input.location) params.set("location", input.location);

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
