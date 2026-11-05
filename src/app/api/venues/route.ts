import { createClient } from "@/lib/supabase/server";
import { buildIlikeOrFilter } from "@/lib/supabase/search";
import { clampPagination } from "@/lib/pagination";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const city   = searchParams.get("city");
  const type   = searchParams.get("type");
  const q      = searchParams.get("q");
  const { page, limit, offset } = clampPagination(
    searchParams.get("page"),
    searchParams.get("limit"),
    { defaultLimit: 12, maxLimit: 50 }
  );

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
  if (q)    query = query.or(buildIlikeOrFilter(q, ["name_ar", "name_en"]));

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
