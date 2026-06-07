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
  const body = await req.json().catch(() => ({}));
  const verify = body.verify !== false; // default true

  const { data, error } = await supabase
    .from("vendors")
    .update({
      admin_verified: verify,
      is_verified: verify,
      verified_by: verify ? admin.id : null,
      verified_at: verify ? new Date().toISOString() : null,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await logAdminAction({
    adminId: admin.id,
    action: verify ? "verify_vendor" : "unverify_vendor",
    entityType: "vendor",
    entityId: id,
    ipAddress: req.headers.get("x-forwarded-for") ?? undefined,
  });

  return NextResponse.json(data);
}
