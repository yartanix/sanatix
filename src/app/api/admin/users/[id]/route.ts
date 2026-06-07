import { createClient } from "@/lib/supabase/server";
import { requireAdmin, logAdminAction } from "@/lib/admin/auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireAdmin();
  if ("error" in result) return result.error;

  const { id } = await params;
  const supabase = await createClient();

  const { data: user, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !user)
    return NextResponse.json({ error: "User not found" }, { status: 404 });

  // Fetch user's bookings
  const { data: bookings } = await supabase
    .from("bookings")
    .select("id, total_amount, currency, status, created_at, event_id")
    .eq("user_id", id)
    .order("created_at", { ascending: false })
    .limit(10);

  // Fetch user's events (if organizer)
  const { data: events } = await supabase
    .from("events")
    .select("id, title_ar, title_en, status, starts_at, venue_city")
    .eq("organizer_id", id)
    .order("created_at", { ascending: false })
    .limit(10);

  return NextResponse.json({ user, bookings: bookings ?? [], events: events ?? [] });
}

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

  // Only allow updating role and status-related fields
  const allowedFields = ["role", "full_name", "city", "country"];
  const updateData: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (field in body) updateData[field] = body[field];
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("profiles")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await logAdminAction({
    adminId: admin.id,
    action: "update_user",
    entityType: "profile",
    entityId: id,
    changes: updateData,
    ipAddress: req.headers.get("x-forwarded-for") ?? undefined,
  });

  return NextResponse.json(data);
}
