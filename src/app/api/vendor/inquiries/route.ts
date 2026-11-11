import { createClient } from "@/lib/supabase/server";
import { clampPagination } from "@/lib/pagination";
import { NextRequest, NextResponse } from "next/server";

// Lists inquiries for the logged-in supplier's own vendor row(s).
// RLS ("vendor_inquiries_owner_rw", migration 016) is the real
// boundary here — this filter just mirrors it so the query doesn't
// rely on RLS silently returning an empty set for a typo'd vendor id.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
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
    return NextResponse.json({ inquiries: [], total: 0, page, limit, pages: 0 });
  }

  let query = supabase
    .from("vendor_inquiries")
    .select("*", { count: "exact" })
    .in("vendor_id", vendorIds)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) query = query.eq("status", status);

  const { data, error, count } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({
    inquiries: data,
    total: count,
    page,
    limit,
    pages: Math.ceil((count ?? 0) / limit),
  });
}
