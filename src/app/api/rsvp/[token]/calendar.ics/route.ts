import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { rsvpTokenSchema } from "@/lib/validation/schemas";
import { buildIcsEvent } from "@/lib/ics";
import { SITE_URL } from "@/lib/constants";
import type { RsvpDetails } from "@/types";

interface Params {
  params: Promise<{ token: string }>;
}

// Same security model as /api/rsvp/[token]: the token in the URL is the
// credential (security-definer get_rsvp_details only ever returns the one
// row matching it). No auth, no listing endpoint — a guest can only ever
// download their own invite as an .ics file.
export async function GET(_req: NextRequest, { params }: Params) {
  const { token } = await params;
  if (!rsvpTokenSchema.safeParse(token).success) {
    return NextResponse.json({ error: "Invalid link" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_rsvp_details", { token }).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Invitation not found" }, { status: 404 });

  const rsvp = data as RsvpDetails;
  const location = [rsvp.location_name, rsvp.location_address].filter(Boolean).join(" — ") || null;

  const ics = buildIcsEvent({
    uid: `party-${rsvp.party_id}@sanatix.net`,
    title: rsvp.title,
    startsAt: rsvp.starts_at,
    location,
    description: rsvp.notes ?? undefined,
    url: `${SITE_URL}/rsvp/${token}`,
  });

  return new NextResponse(ics, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${slugify(rsvp.title)}.ics"`,
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
