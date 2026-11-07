import { NextResponse } from "next/server";

/**
 * Placeholder landing point for Lite's payment webhook.
 *
 * Deliberately a 501, not a working handler: Lite's actual webhook
 * payload shape, signature scheme, and event types aren't known yet (no
 * sandbox docs/credentials as of Nov 5 2026 — see the outreach to
 * mohamed@lite.sa). Returning 501 means if Lite starts sending events
 * here before this is implemented, that shows up loudly in their
 * dashboard as "not implemented" rather than silently 200'ing and
 * dropping real payment events on the floor.
 *
 * When Lite's webhook docs arrive, replace this body with: verify the
 * request signature against LITE_WEBHOOK_SECRET, parse the event, and
 * update the matching `bookings.payment_ref`/`status` or
 * `contributions.payment_ref` row via the payment-provider abstraction
 * in @/lib/payments.
 */
export async function POST() {
  return NextResponse.json(
    { error: "Lite webhook handling is not implemented yet — no sandbox credentials/docs configured." },
    { status: 501 }
  );
}
