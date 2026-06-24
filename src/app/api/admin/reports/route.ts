import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin/auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const result = await requireAdmin();
  if ("error" in result) return result.error;

  const supabase = await createClient();
  const { searchParams } = new URL(request.url);

  const page       = parseInt(searchParams.get("page")   ?? "1");
  const limit      = parseInt(searchParams.get("limit")  ?? "20");
  const offset     = (page - 1) * limit;
  const status     = searchParams.get("status");
  const entityType = searchParams.get("entity_type");
  const sortBy     = searchParams.get("sort") ?? "created_at";
  const sortDir    = searchParams.get("dir")  === "asc";

  let query = supabase
    .from("content_reports")
    .select(
      `id, reported_entity_type, reported_entity_id, reason, description,
       status, resolution_notes, created_at, resolved_at,
       reporter_id,
       profiles!reporter_id (full_name, avatar_url)`,
      { count: "exact" }
    )
    .order(sortBy, { ascending: sortDir })
    .range(offset, offset + limit - 1);

  if (status)     query = query.eq("status", status);
  if (entityType) query = query.eq("reported_entity_type", entityType);

  const { data, error, count } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    reports: data,
    total: count ?? 0,
    page,
    limit,
    pages: Math.ceil((count ?? 0) / limit),
  });
}
