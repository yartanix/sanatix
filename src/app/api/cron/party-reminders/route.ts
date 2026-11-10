import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPartyInvite } from "@/lib/notifications/messaging";
import { formatDateTime } from "@/lib/utils";
import { SITE_URL } from "@/lib/constants";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

// Sends a "your party is tomorrow" reminder over WhatsApp/SMS to guests
// who gave a phone number and opted the party into auto-send. Same
// fail-closed CRON_SECRET auth as /api/cron/content-agent — this route
// also reaches across users via the service-role client (every host's
// parties, not just one), so an unauthenticated version would be a real
// abuse vector, not just a theoretical one.
//
// Window: parties starting between 20 and 28 hours from now, so a daily
// cron run always catches "tomorrow" exactly once per party regardless
// of what time of day the cron fires. last_reminder_sent_at is checked
// first so a party that's somehow swept twice (a retried cron run,
// manual trigger) never double-sends.
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error("[party-reminders] CRON_SECRET is not set — refusing to run unauthenticated.");
    return NextResponse.json({ error: "Server misconfigured: CRON_SECRET is not set" }, { status: 500 });
  }
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = new Date();
  const windowStart = new Date(now.getTime() + 20 * 60 * 60 * 1000).toISOString();
  const windowEnd = new Date(now.getTime() + 28 * 60 * 60 * 1000).toISOString();

  const { data: parties, error } = await admin
    .from("parties")
    .select("id, title, starts_at, auto_send_channel")
    .neq("auto_send_channel", "none")
    .gte("starts_at", windowStart)
    .lte("starts_at", windowEnd);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const party of parties ?? []) {
    const channel = party.auto_send_channel as "whatsapp" | "sms";
    const whenText = formatDateTime(party.starts_at, "en-US");

    const { data: guests } = await admin
      .from("party_guests")
      .select("id, name, phone, rsvp_token, rsvp_status, last_reminder_sent_at")
      .eq("party_id", party.id)
      .not("phone", "is", null)
      .in("rsvp_status", ["yes", "pending", "maybe"])
      .is("last_reminder_sent_at", null);

    for (const guest of guests ?? []) {
      if (!guest.phone) continue;
      const result = await sendPartyInvite({
        channel,
        phone: guest.phone,
        guestName: guest.name,
        partyTitle: party.title,
        whenText,
        rsvpUrl: `${SITE_URL}/rsvp/${guest.rsvp_token}`,
        kind: "reminder",
      });

      if (result.skipped) {
        skipped++;
        continue;
      }
      if (result.ok) {
        sent++;
        await admin
          .from("party_guests")
          .update({ last_reminder_sent_at: new Date().toISOString() })
          .eq("id", guest.id);
      } else {
        failed++;
      }
    }
  }

  return NextResponse.json({ partiesSwept: parties?.length ?? 0, sent, skipped, failed });
}
