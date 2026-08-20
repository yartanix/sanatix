import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const city     = searchParams.get("city");
  const category = searchParams.get("category");
  const q        = searchParams.get("q");
  const featured = searchParams.get("featured");
  const page     = parseInt(searchParams.get("page") ?? "1");
  const limit    = parseInt(searchParams.get("limit") ?? "12");
  const offset   = (page - 1) * limit;

  const supabase = await createClient();

  let query = supabase
    .from("vendors")
    .select("*", { count: "exact" })
    // Mirrors /api/events' hardcoded `status = 'published'` filter: this is
    // the actual enforcement point of the "agents never publish" rule for
    // vendors, which have no status column of their own. Without this,
    // every agent-drafted row (is_verified defaults false, see
    // src/lib/agents/content-agent.ts) was publicly visible the instant it
    // was inserted — a real safety gap, not a stylistic choice. A vendor
    // only appears here once a human has reviewed it and flipped
    // is_verified to true (currently done directly in Supabase; no admin
    // UI yet — see 07-Autonomous-Agents.md).
    .eq("is_verified", true)
    .order("is_featured", { ascending: false })
    .order("rating", { ascending: false })
    .range(offset, offset + limit - 1);

  if (city)     query = query.eq("city", city);
  if (category) query = query.eq("category", category);
  if (featured) query = query.eq("is_featured", true);
  if (q)        query = query.or(`name_ar.ilike.%${q}%,name_en.ilike.%${q}%`);

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
