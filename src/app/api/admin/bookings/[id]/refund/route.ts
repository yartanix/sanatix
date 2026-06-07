import { createClient } from "@/lib/supabase/server";
import { requireAdmin, logAdminAction } from "@/lib/admin/auth";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireAdmin();
  if ("error" in result) return result.error;
  const { admin } = result;

  const { id } = await params;
  const supabase = await createClient();
  const body = await req.json().catch(() => ({}));

  // Fetch booking first
  const { data: booking, error: fetchError } = await supabase
    .from("bookings")
    .select("id, status, total_amount, currency, user_id")
    .eq("id", id)
    .single();

  if (fetchError || !booking)
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });

  if (booking.status === "refunded")
    return NextResponse.json({ error: "Booking already refunded" }, { status: 400 });

  const { data, error } = await supabase
    .from("bookings")
    .update({ status: "refunded" })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await logAdminAction({
    adminId: admin.id,
    action: "refund_booking",
    entityType: "booking",
    entityId: id,
    changes: { reason: body.reason ?? "Admin initiated refund", amount: booking.total_amount },
    ipAddress: req.headers.get("x-forwarded-for") ?? undefined,
  });

  return NextResponse.json(data);
}
