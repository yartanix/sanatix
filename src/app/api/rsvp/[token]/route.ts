import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendExpoPushNotifications } from "@/lib/push/send-expo-push";
import { NextRequest, NextResponse, after } from "next/server";
import { rsvpTokenSchema, rsvpSubmitSchema } from "@/lib/validation/schemas";
import type { RsvpDetails } from "@/types";

interface Params {
  params: Promise<{ token: string }>;
}

// No auth on this route at all, by design — the token in the URL *is*
// the credential, same as any calendar/wedding RSVP link. Both reads and
// writes go through the get_rsvp_details/submit_rsvp Postgres functions
// (migration 011), which are security definer and only ever touch the
// single row matching that exact token — there is no listing endpoint,
// so a guest can never see or edit anyone else's RSVP.
export async function GET(_req: NextRequest, { params }: Params) {
  const { token } = await params;
  if (!rsvpTokenSchema.safeParse(token).success) {
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
  if (!rsvpTokenSchema.safeParse(token).success) {
    return NextResponse.json({ error: "Invalid link" }, { status: 400 });
  }

  const json = await req.json().catch(() => null);
  const parsed = rsvpSubmitSchema.safeParse(json);
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
    new_custom_answer: parsed.data.customAnswer ?? null,
  });

  if (error) return NextResponse.json({ error: "Invitation not found" }, { status: 404 });

  // Best-effort: let the host know on their phone. Runs via Next's after()
  // so it actually finishes on serverless (Vercel can otherwise freeze the
  // function the instant the response below is sent) — but it never blocks
  // or fails the RSVP response itself. The guest's RSVP is already saved
  // at this point regardless of what happens here.
  after(() =>
    notifyHostOfRsvp(token, parsed.data.status).catch((err) =>
      console.error("notifyHostOfRsvp failed:", err)
    )
  );

  return NextResponse.json({ ok: true });
}

async function notifyHostOfRsvp(token: string, status: "yes" | "no" | "maybe") {
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_rsvp_details", { token }).maybeSingle();
  if (!data) return;
  const details = data as RsvpDetails;

  // Needs the service-role client from here on: finding "who hosts this
  // party" and "what are their push tokens" is a cross-user lookup by
  // design (a guest's request is what triggers notifying a different
  // person, the host) and isn't something RLS is meant to allow for an
  // unauthenticated guest session. This is read-only and narrowly scoped
  // to exactly the one party this RSVP belongs to.
  const admin = createAdminClient();
  const { data: party } = await admin
    .from("parties")
    .select("host_id")
    .eq("id", details.party_id)
    .maybeSingle();
  if (!party) return;

  const { data: tokens } = await admin
    .from("push_tokens")
    .select("expo_push_token")
    .eq("user_id", party.host_id);
  if (!tokens || tokens.length === 0) return;

  const statusLabel = status === "yes" ? "is coming" : status === "no" ? "can't make it" : "might come";
  await sendExpoPushNotifications(
    tokens.map((t) => t.expo_push_token),
    "New RSVP",
    `${details.guest_name} ${statusLabel} to ${details.title}`,
    { partyId: details.party_id }
  );
}
