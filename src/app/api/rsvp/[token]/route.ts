import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { RsvpDetails } from "@/types";

interface Params {
  params: Promise<{ token: string }>;
}

const tokenSchema = z.string().uuid();
const rsvpBodySchema = z.object({
  status: z.enum(["yes", "no", "maybe"]),
  guestCount: z.number().int().min(1).max(20).optional(),
});

// No auth on this route at all, by design — the token in the URL *is*
// the credential, same as any calendar/wedding RSVP link. Both reads and
// writes go through the get_rsvp_details/submit_rsvp Postgres functions
// (migration 011), which are security definer and only ever touch the
// single row matching that exact token — there is no listing endpoint,
// so a guest can never see or edit anyone else's RSVP.
export async function GET(_req: NextRequest, { params }: Params) {
  const { token } = await params;
  if (!tokenSchema.safeParse(token).success) {
    return NextResponse.json({ error: "Invalid link" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_rsvp_details", { token }).maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Invitation not found" }, { status: 404 });

  return NextResponse.json({ rsvp: data as RsvpDetails });
}

export async function POST(req: NextRequest, { params }: Params) {
  const { token } = await params;
  if (!tokenSchema.safeParse(token).success) {
    return NextResponse.json({ error: "Invalid link" }, { status: 400 });
  }

  const json = await req.json().catch(() => null);
  const parsed = rsvpBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_rsvp", {
    token,
    new_status: parsed.data.status,
    new_guest_count: parsed.data.guestCount ?? 1,
  });

  if (error) return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
