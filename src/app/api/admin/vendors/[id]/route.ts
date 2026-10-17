import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// Both handlers use the session-bound client, not createAdminClient() — the
// real authorization boundary is the vendors_manage_admin RLS policy
// (migration 006), which only lets a profiles.role = 'admin' user touch a
// vendor row they don't own. The role check below is just for a clean 403
// instead of a confusing RLS failure.
async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!profile || profile.role !== "admin") {
    return { supabase, error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { supabase, error: null };
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, error: authError } = await requireAdmin();
  if (authError) return authError;

  const body = await req.json().catch(() => null);
  if (typeof body?.is_verified !== "boolean") {
    return NextResponse.json({ error: "is_verified (boolean) is required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("vendors")
    .update({ is_verified: body.is_verified })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

// Reject: vendors have no "rejected" status to flip to (just the
// is_verified boolean), so rejecting removes the row from the review
// queue outright rather than leaving it to show up again indistinguishable
// from a not-yet-reviewed vendor.
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, error: authError } = await requireAdmin();
  if (authError) return authError;

  const { error } = await supabase.from("vendors").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ deleted: true });
}
