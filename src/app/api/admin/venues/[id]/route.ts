import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// Session-bound client: the venues_manage_admin RLS policy (migration 005)
// is what actually authorizes this, same reasoning as the vendors route.
export async function PATCH(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Unpublish rather than delete — matches the rollback SQL documented in
  // docs/content-agent-v2.md (`update venues set is_published = false`), so
  // the row stays as a dedup backstop and the agent won't re-import it.
  const { data, error } = await supabase
    .from("venues")
    .update({ is_published: false })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}
