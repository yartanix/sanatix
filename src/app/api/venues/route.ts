import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const city   = searchParams.get("city");
  const type   = searchParams.get("type");
  const q      = searchParams.get("q");
  const page   = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit  = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "12")));
  const offset = (page - 1) * limit;

  const supabase = await createClient();

  // RLS (venues_read_published) already hides unpublished rows for anon /
  // regular users; the explicit filter keeps admins seeing the same list
  // the public sees on this endpoint.
  let query = supabase
    .from("venues")
    .select("*", { count: "exact" })
    .eq("is_published", true)
    .order("is_featured", { ascending: false })
    .order("rating", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (city) query = query.eq("city", city);
  if (type) query = query.eq("venue_type", type);
  if (q)    query = query.or(`name_ar.ilike.%${q}%,name_en.ilike.%${q}%`);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    venues: data,
    total: count,
    page,
    limit,
    pages: Math.ceil((count ?? 0) / limit),
  });
}
