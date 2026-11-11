import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { NextResponse } from "next/server";

const checkinSchema = z.object({ code: z.string().min(4).max(64) });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = checkinSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { data, error } = await supabase.rpc("check_in_booking", {
    p_event_id: id,
    p_code: parsed.data.code,
  });

  if (error) return NextResponse.json({ error: "No matching confirmed booking found" }, { status: 404 });
  const row = (Array.isArray(data) ? data[0] : data) as
    | { booking_id: string; guest_name: string; already_checked_in: boolean }
    | undefined;
  if (!row) return NextResponse.json({ error: "No matching confirmed booking found" }, { status: 404 });

  return NextResponse.json({
    bookingId: row.booking_id,
    guestName: row.guest_name,
    alreadyCheckedIn: row.already_checked_in,
  });
}
