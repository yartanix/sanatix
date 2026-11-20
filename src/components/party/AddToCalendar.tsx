"use client";

import { CalendarPlus } from "lucide-react";
import { buildGoogleCalendarUrl } from "@/lib/ics";

// Two buttons, two different real integration surfaces — there's no
// single "add to calendar" API that works everywhere:
//   - .ics download: opens directly in Apple Calendar / Outlook on any
//     platform (this is exactly what Apple's own "Invites" app does
//     under the hood — Invites has no public API for a third party like
//     Sanatix to hook into, so a standards-based .ics file is the real,
//     documented equivalent any app can offer).
//   - Google Calendar: Google's own "render" URL opens their add-event
//     UI pre-filled; most Android users land here by default.
export default function AddToCalendar({
  token,
  title,
  startsAt,
  location,
  notes,
  isRTL,
}: {
  token: string;
  title: string;
  startsAt: string;
  location: string | null;
  notes: string | null;
  isRTL: boolean;
}) {
  const googleUrl = buildGoogleCalendarUrl({
    uid: `party-${token}`,
    title,
    startsAt,
    location,
    description: notes ?? undefined,
  });

  return (
    <div className="flex flex-col sm:flex-row gap-2.5">
      <a
        href={`/api/rsvp/${token}/calendar.ics`}
        className="flex-1 inline-flex items-center justify-center gap-2 border border-brand-ink/15 text-brand-ink font-semibold py-2.5 px-4 rounded-xl text-sm hover:bg-brand-ink/5 transition-colors"
      >
        <CalendarPlus size={16} />
        {isRTL ? "أضف إلى تقويم آبل" : "Add to Apple Calendar"}
      </a>
      <a
        href={googleUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-1 inline-flex items-center justify-center gap-2 border border-brand-ink/15 text-brand-ink font-semibold py-2.5 px-4 rounded-xl text-sm hover:bg-brand-ink/5 transition-colors"
      >
        <CalendarPlus size={16} />
        {isRTL ? "أضف إلى تقويم جوجل" : "Add to Google Calendar"}
      </a>
    </div>
  );
}
