import { createClient } from "@/lib/supabase/server";
import { clampPagination } from "@/lib/pagination";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const { page, limit, offset } = clampPagination(
    searchParams.get("page"),
    searchParams.get("limit"),
    { defaultLimit: 20, maxLimit: 100 }
  );

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: vendors } = await supabase.from("vendors").select("id").eq("owner_id", user.id);
  const vendorIds = (vendors ?? []).map((v) => v.id);
  if (vendorIds.length === 0) {
    return NextResponse.json({ reviews: [], total: 0, page, limit, pages: 0 });
  }

  const { data, error, count } = await supabase
    .from("reviews")
    .select("*, profiles(full_name, avatar_url)", { count: "exact" })
    .in("vendor_id", vendorIds)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({
    reviews: data,
    total: count,
    page,
    limit,
    pages: Math.ceil((count ?? 0) / limit),
  });
}
