import { createClient } from "@/lib/supabase/server";
import { requireAdmin, logAdminAction } from "@/lib/admin/auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const result = await requireAdmin();
  if ("error" in result) return result.error;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("platform_settings")
    .select("*")
    .order("key");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ settings: data });
}

export async function PUT(req: NextRequest) {
  const result = await requireAdmin();
  if ("error" in result) return result.error;
  const { admin } = result;

  const supabase = await createClient();
  const body = await req.json();

  if (!body.key || body.value === undefined) {
    return NextResponse.json({ error: "key and value are required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("platform_settings")
    .upsert(
      {
        key: body.key,
        value: body.value,
        description: body.description,
        updated_by: admin.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await logAdminAction({
    adminId: admin.id,
    action: "update_setting",
    entityType: "platform_setting",
    changes: { key: body.key, value: body.value },
    ipAddress: req.headers.get("x-forwarded-for") ?? undefined,
  });

  return NextResponse.json(data);
}
