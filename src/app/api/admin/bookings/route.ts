import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin/auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const result = await requireAdmin();
  if ("error" in result) return result.error;

  const supabase = await createClient();
  const { searchParams } = new URL(request.url);

  const page    = parseInt(searchParams.get("page")   ?? "1");
  const limit   = parseInt(searchParams.get("limit")  ?? "20");
  const offset  = (page - 1) * limit;
  const status  = searchParams.get("status");
  const eventId = searchParams.get("event_id");
  const q       = searchParams.get("q");
  const sortBy  = searchParams.get("sort") ?? "created_at";
  const sortDir = searchParams.get("dir")  === "asc";

  let query = supabase
    .from("bookings")
    .select(
      `id, quantity, total_amount, currency, status, qr_code, payment_ref, created_at, updated_at,
       user_id, event_id, ticket_type_id,
       profiles!user_id (full_name, avatar_url),
       events!event_id (title_ar, title_en, venue_city),
       ticket_types!ticket_type_id (name_ar, name_en, price)`,
      { count: "exact" }
    )
    .order(sortBy, { ascending: sortDir })
    .range(offset, offset + limit - 1);

  if (status)  query = query.eq("status", status);
  if (eventId) query = query.eq("event_id", eventId);
  if (q)       query = query.eq("payment_ref", q);

  const { data, error, count } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Revenue summary
  const { data: revenueData } = await supabase
    .from("bookings")
    .select("total_amount, currency")
    .eq("status", "confirmed");

  const totalRevenue =
    revenueData?.reduce((sum, b) => sum + (b.total_amount ?? 0), 0) ?? 0;

  return NextResponse.json({
    bookings: data,
    total: count ?? 0,
    page,
    limit,
    pages: Math.ceil((count ?? 0) / limit),
    revenue: { total: totalRevenue },
  });
}
