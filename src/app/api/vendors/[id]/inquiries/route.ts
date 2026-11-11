import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { NextResponse } from "next/server";

// Public endpoint: anyone (including a signed-out visitor) may ask a
// vendor a question — same no-account-required posture as party RSVP.
// RLS ("vendor_inquiries_insert_any") allows the insert; this route
// just validates shape and attaches the signed-in user id when there
// is one, for the vendor's own reference.
const inquirySchema = z.object({
  name: z.string().min(1).max(120),
  phone: z.string().max(30).optional(),
  email: z.string().email().max(200).optional(),
  eventDate: z.string().date().optional(),
  message: z.string().min(1).max(2000),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: vendorId } = await params;
  const parsed = inquirySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("vendor_inquiries")
    .insert({
      vendor_id: vendorId,
      user_id: user?.id ?? null,
      name: parsed.data.name,
      phone: parsed.data.phone ?? null,
      email: parsed.data.email ?? null,
      event_date: parsed.data.eventDate ?? null,
      message: parsed.data.message,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data, { status: 201 });
}
