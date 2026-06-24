import { createClient } from "@/lib/supabase/server";
import { requireAdmin, logAdminAction } from "@/lib/admin/auth";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireAdmin();
  if ("error" in result) return result.error;
  const { admin } = result;

  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("events")
    .update({
      event_status: "approved",
      reviewed_by: admin.id,
      reviewed_at: new Date().toISOString(),
      rejection_reason: null,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await logAdminAction({
    adminId: admin.id,
    action: "approve_event",
    entityType: "event",
    entityId: id,
    ipAddress: req.headers.get("x-forwarded-for") ?? undefined,
  });

  return NextResponse.json(data);
}
