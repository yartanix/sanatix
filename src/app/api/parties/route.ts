import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const createPartySchema = z.object({
  title: z.string().min(1).max(200),
  startsAt: z.string().datetime({ offset: true }).or(z.string().min(1)),
  locationName: z.string().max(200).optional(),
  locationAddress: z.string().max(500).optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  notes: z.string().max(2000).optional(),
  coverImage: z.string().url().optional(),
  templateId: z.string().uuid().optional(),
  allowPlusOnes: z.boolean().optional(),
  customQuestion: z.string().max(300).optional(),
  requireEntryCode: z.boolean().optional(),
  entryCode: z.string().max(40).optional(),
  autoSendChannel: z.enum(["none", "whatsapp", "sms"]).optional(),
});

// A party's host — any logged-in user, not just organizers. This is the
// "arrange an event" capability, deliberately separate from the
// organizer/event publishing flow: a party isn't published, isn't
// ticketed, and isn't discoverable by anyone except whoever the host
// explicitly shares an RSVP link with.
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("parties")
    .select("*, party_guests(id, rsvp_status)")
    .eq("host_id", user.id)
    .order("starts_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ parties: data });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const json = await req.json().catch(() => null);
  const parsed = createPartySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 }
    );
  }
  const {
    title, startsAt, locationName, locationAddress, lat, lng, notes, coverImage,
    templateId, allowPlusOnes, customQuestion, requireEntryCode, entryCode, autoSendChannel,
  } = parsed.data;

  // An organizer can turn on "require an entry code" without typing one —
  // generate a short, door-staff-friendly code rather than leaving the
  // party unprotected or rejecting the request.
  const resolvedEntryCode =
    requireEntryCode ? (entryCode?.trim() || Math.random().toString(36).slice(2, 8).toUpperCase()) : null;

  const { data, error } = await supabase
    .from("parties")
    .insert({
      host_id: user.id,
      title,
      starts_at: startsAt,
      location_name: locationName ?? null,
      location_address: locationAddress ?? null,
      lat: lat ?? null,
      lng: lng ?? null,
      notes: notes ?? null,
      cover_image: coverImage ?? null,
      template_id: templateId ?? null,
      allow_plus_ones: allowPlusOnes ?? true,
      custom_question: customQuestion?.trim() || null,
      require_entry_code: requireEntryCode ?? false,
      entry_code: resolvedEntryCode,
      auto_send_channel: autoSendChannel ?? "none",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ party: data }, { status: 201 });
}
