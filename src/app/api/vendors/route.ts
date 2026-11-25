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
    .from("vendors")
    .select("*", { count: "exact" })
    // Not gated on is_verified (Fahoood's call, Nov 25 2026): every vendor is
    // returned, verified or not, so this endpoint matches what /vendors now
    // shows on the web. is_verified is still in the row for any consumer
    // that wants to badge/sort by it (see VendorCard on the web for the
    // pattern). Previously gated here — see git history on this line — to
    // keep unreviewed agent-drafted rows (is_verified defaults false, see
    // src/lib/agents/content-agent.ts) off any public listing, but that
    // moderation now happens by labeling rather than hiding.
    .order("is_verified", { ascending: false })
    .order("is_featured", { ascending: false })
    .order("rating", { ascending: false })
    .range(offset, offset + limit - 1);

  if (city)     query = query.eq("city", city);
  if (category) query = query.eq("category", category);
  if (featured) query = query.eq("is_featured", true);
  if (q)        query = query.or(buildIlikeOrFilter(q, ["name_ar", "name_en"]));

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    vendors: data,
    total: count,
    page,
    limit,
    pages: Math.ceil((count ?? 0) / limit),
  });
}
