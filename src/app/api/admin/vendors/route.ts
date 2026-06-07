import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin/auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const result = await requireAdmin();
  if ("error" in result) return result.error;

  const supabase = await createClient();
  const { searchParams } = new URL(request.url);

  const page     = parseInt(searchParams.get("page")   ?? "1");
  const limit    = parseInt(searchParams.get("limit")  ?? "20");
  const offset   = (page - 1) * limit;
  const verified = searchParams.get("verified");
  const q        = searchParams.get("q");
  const sortBy   = searchParams.get("sort") ?? "created_at";
  const sortDir  = searchParams.get("dir")  === "asc";

  let query = supabase
    .from("vendors")
    .select(
      `id, name_ar, name_en, category, city, country, is_verified, admin_verified,
       is_featured, rating, review_count, logo_url, created_at,
       owner_id,
       profiles!owner_id (full_name, avatar_url)`,
      { count: "exact" }
    )
    .order(sortBy, { ascending: sortDir })
    .range(offset, offset + limit - 1);

  if (verified === "true")  query = query.eq("admin_verified", true);
  if (verified === "false") query = query.eq("admin_verified", false);
  if (q) query = query.or(`name_ar.ilike.%${q}%,name_en.ilike.%${q}%`);

  const { data, error, count } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    vendors: data,
    total: count ?? 0,
    page,
    limit,
    pages: Math.ceil((count ?? 0) / limit),
  });
}
