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
  const role     = searchParams.get("role");
  const q        = searchParams.get("q");
  const sortBy   = searchParams.get("sort")  ?? "created_at";
  const sortDir  = searchParams.get("dir")   === "asc";

  let query = supabase
    .from("profiles")
    .select("id, full_name, phone, avatar_url, role, locale, city, country, created_at, updated_at", {
      count: "exact",
    })
    .order(sortBy, { ascending: sortDir })
    .range(offset, offset + limit - 1);

  if (role) query = query.eq("role", role);
  if (q)    query = query.or(`full_name.ilike.%${q}%,phone.ilike.%${q}%`);

  const { data, error, count } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    users: data,
    total: count ?? 0,
    page,
    limit,
    pages: Math.ceil((count ?? 0) / limit),
  });
}
