import { createClient } from "@/lib/supabase/server";
import { buildIlikeOrFilter } from "@/lib/supabase/search";
import { clampPagination } from "@/lib/pagination";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const city     = searchParams.get("city");
  const category = searchParams.get("category");
  const q        = searchParams.get("q");
  const featured = searchParams.get("featured");
  const { page, limit, offset } = clampPagination(
    searchParams.get("page"),
    searchParams.get("limit"),
    { defaultLimit: 12, maxLimit: 50 }
  );

  const supabase = await createClient();

  let query = supabase
    .from("events")
    .select(`
      *,
      ticket_types (id, price, currency, status)
    `, { count: "exact" })
    .eq("status", "published")
    .gte("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: true })
    .range(offset, offset + limit - 1);

  if (city)     query = query.eq("venue_city", city);
  if (category) query = query.eq("category", category);
  if (featured) query = query.eq("is_featured", true);
  if (q)        query = query.or(buildIlikeOrFilter(q, ["title_ar", "title_en"]));

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    events: data,
    total: count,
    page,
    limit,
    pages: Math.ceil((count ?? 0) / limit),
  });
}
