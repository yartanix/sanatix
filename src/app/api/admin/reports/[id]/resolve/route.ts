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
  const body = await req.json();

  const newStatus = body.status ?? "resolved";
  if (!["reviewed", "resolved", "dismissed"].includes(newStatus)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("content_reports")
    .update({
      status: newStatus,
      resolved_by: admin.id,
      resolution_notes: body.notes ?? null,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await logAdminAction({
    adminId: admin.id,
    action: "resolve_report",
    entityType: "content_report",
    entityId: id,
    changes: { status: newStatus, notes: body.notes },
    ipAddress: req.headers.get("x-forwarded-for") ?? undefined,
  });

  return NextResponse.json(data);
}
