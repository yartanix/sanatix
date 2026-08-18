import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const page   = parseInt(searchParams.get("page") ?? "1");
  const limit  = parseInt(searchParams.get("limit") ?? "50");
  const offset = (page - 1) * limit;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: event } = await supabase
    .from("events")
    .select("id")
    .eq("id", id)
    .eq("organizer_id", user.id)
    .single();
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  let query = supabase
    .from("bookings")
    .select(
      `
      id, quantity, total_amount, currency, status, qr_code, created_at,
      profiles ( id, full_name, phone ),
      ticket_types ( id, name_ar, name_en )
    `,
      { count: "exact" }
    )
    .eq("event_id", id)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) query = query.eq("status", status);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({
    attendees: data,
    total: count,
    page,
    limit,
    pages: Math.ceil((count ?? 0) / limit),
  });
}
