import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { buildIcsEvent } from "@/lib/ics";
import { SITE_URL } from "@/lib/constants";

interface Params {
  params: Promise<{ id: string }>;
}

// Same auth model as /api/bookings/[id]/ticket: RLS on `bookings` (policy
// "bookings_own") already restricts selects to the booking's own user_id,
// so a plain authenticated client query is enough to make sure nobody can
// download someone else's calendar invite.
export async function GET(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: booking } = await supabase
    .from("bookings")
    .select(
      `
      id,
      events ( title_ar, title_en, starts_at, ends_at, venue_name, venue_city )
    `
    )
    .eq("id", id)
    .single();

  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  const event = booking.events as unknown as {
    title_ar: string | null;
    title_en: string | null;
    starts_at: string;
    ends_at: string | null;
    venue_name: string | null;
    venue_city: string | null;
  };
  const title = event?.title_en || event?.title_ar || "Sanatix event";
  const location = [event?.venue_name, event?.venue_city].filter(Boolean).join(", ") || null;

  const ics = buildIcsEvent({
    uid: `booking-${id}@sanatix.net`,
    title,
    startsAt: event.starts_at,
    endsAt: event.ends_at,
    location,
    url: `${SITE_URL}/bookings/${id}/confirm`,
  });

  return new NextResponse(ics, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${slugify(title)}.ics"`,
      "Cache-Control": "private, no-store",
    },
  });
}

function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return base || "sanatix-event";
}
