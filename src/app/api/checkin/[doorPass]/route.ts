import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

interface Params {
  params: Promise<{ doorPass: string }>;
}

const doorPassSchema = z.string().uuid();
// Either a guest's full rsvp_token (uuid) or the short 8-char prefix
// shown as a plain-text "entry code" under their QR — see migration 015.
const checkinBodySchema = z.object({
  guestRef: z.string().min(6).max(36),
});

// Door-side check-in, gated by a party's door_pass_token rather than a
// login — the same "the link is the credential" pattern as the RSVP
// flow (migration 011), extended so a host can hand check-in duty to
// someone else (a friend, or a staffing vendor booked through the
// marketplace) without giving them account access. The RPCs behind
// this are security definer and scoped to exactly the one party whose
// door_pass_token was given — see migration 015.
export async function GET(_req: NextRequest, { params }: Params) {
  const { doorPass } = await params;
  if (!doorPassSchema.safeParse(doorPass).success) {
    return NextResponse.json({ error: "Invalid link" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_door_pass_party", { door_pass: doorPass }).maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Link not found" }, { status: 404 });

  return NextResponse.json({ party: data });
}

export async function POST(req: NextRequest, { params }: Params) {
  const { doorPass } = await params;
  if (!doorPassSchema.safeParse(doorPass).success) {
    return NextResponse.json({ error: "Invalid link" }, { status: 400 });
  }

  const json = await req.json().catch(() => null);
  const parsed = checkinBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("checkin_by_door_pass", { door_pass: doorPass, guest_ref: parsed.data.guestRef })
    .maybeSingle();

  if (error) {
    // Deliberately vague to anyone probing — "guest not found for this
    // party" and "invalid door pass" both collapse to the same 404 the
    // caller sees, same as the RSVP token route does for bad tokens.
    return NextResponse.json({ error: "Guest not found for this invite" }, { status: 404 });
  }

  const result = data as { guest_name: string; already_checked_in: boolean } | null;
  return NextResponse.json({
    guestName: result?.guest_name,
    alreadyCheckedIn: result?.already_checked_in ?? false,
  });
}
