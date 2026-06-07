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
  const adminId    = searchParams.get("admin_id");
  const action     = searchParams.get("action");
  const entityType = searchParams.get("entity_type");
  const from       = searchParams.get("from");
  const to         = searchParams.get("to");

  let query = supabase
    .from("activity_logs")
    .select(
      `id, action, entity_type, entity_id, changes, ip_address, created_at,
       admin_id,
       profiles!admin_id (full_name, avatar_url)`,
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (adminId)    query = query.eq("admin_id", adminId);
  if (action)     query = query.eq("action", action);
  if (entityType) query = query.eq("entity_type", entityType);
  if (from)       query = query.gte("created_at", from);
  if (to)         query = query.lte("created_at", to);

  const { data, error, count } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    logs: data,
    total: count ?? 0,
    page,
    limit,
    pages: Math.ceil((count ?? 0) / limit),
  });
}
