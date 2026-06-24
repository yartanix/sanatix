import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin/auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const result = await requireAdmin();
  if ("error" in result) return result.error;

  const supabase = await createClient();
  const { searchParams } = new URL(request.url);

  const page        = parseInt(searchParams.get("page")   ?? "1");
  const limit       = parseInt(searchParams.get("limit")  ?? "20");
  const offset      = (page - 1) * limit;
  const status      = searchParams.get("status");
  const eventStatus = searchParams.get("event_status");
  const q           = searchParams.get("q");
  const sortBy      = searchParams.get("sort") ?? "created_at";
  const sortDir     = searchParams.get("dir")  === "asc";

  let query = supabase
    .from("events")
    .select(
      `id, title_ar, title_en, status, event_status, starts_at, ends_at,
       venue_city, category, is_featured, is_free, view_count, created_at,
       organizer_id,
       profiles!organizer_id (full_name, avatar_url),
       ticket_types (id, price, currency, total_quantity, sold_quantity)`,
      { count: "exact" }
    )
    .order(sortBy, { ascending: sortDir })
    .range(offset, offset + limit - 1);

  if (status)      query = query.eq("status", status);
  if (eventStatus) query = query.eq("event_status", eventStatus);
  if (q)           query = query.or(`title_ar.ilike.%${q}%,title_en.ilike.%${q}%`);

  const { data, error, count } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    events: data,
    total: count ?? 0,
    page,
    limit,
    pages: Math.ceil((count ?? 0) / limit),
  });
}
