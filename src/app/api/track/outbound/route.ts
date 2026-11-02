import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";

// Logs an outbound click (currently: "get tickets" links to an external
// ticket seller). This is intentionally write-only analytics — no auth
// required, since most visitors clicking a ticket link aren't logged in,
// and nothing here can read back other users' clicks (see migration 010's
// RLS policy). A failure here must never block the user's actual
// navigation, so this always returns quickly and the caller treats it as
// fire-and-forget.
const bodySchema = z.object({
  kind: z.enum(["event_ticket", "venue_website", "vendor_website"]),
  targetUrl: z.string().url(),
  eventId: z.string().uuid().optional(),
  venueId: z.string().uuid().optional(),
  vendorId: z.string().uuid().optional(),
  locale: z.string().max(5).optional(),
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 }
    );
  }

  const { kind, targetUrl, eventId, venueId, vendorId, locale } = parsed.data;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { error } = await supabase.from("outbound_clicks").insert({
    kind,
    target_url: targetUrl,
    event_id: eventId ?? null,
    venue_id: venueId ?? null,
    vendor_id: vendorId ?? null,
    user_id: user?.id ?? null,
    locale: locale ?? null,
  });

  if (error) {
    // Don't surface Supabase internals to the client; this is best-effort
    // analytics, not a user-facing operation.
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
