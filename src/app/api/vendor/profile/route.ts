import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// A user may own more than one vendor in theory, but today's product
// (and the mobile Supplier app) assumes one vendor per supplier
// account — same simplifying assumption as organizer/profile. Returns
// the first (oldest) vendor row owned by this user.
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("vendors")
    .select("*")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!data) return NextResponse.json({ error: "No vendor profile found for this account" }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  // id/owner_id/created_at are never client-settable. is_verified /
  // is_featured / is_premium are also stripped here even though the
  // DB trigger (migration 013) already blocks them for a non-admin —
  // belt-and-suspenders, and it avoids a confusing silent-no-op error
  // surfacing from the trigger instead of just being ignored.
  delete body.id;
  delete body.owner_id;
  delete body.created_at;
  delete body.is_verified;
  delete body.is_featured;
  delete body.is_premium;
  delete body.rating;
  delete body.review_count;

  const { data: existing } = await supabase
    .from("vendors")
    .select("id")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!existing) return NextResponse.json({ error: "No vendor profile found for this account" }, { status: 404 });

  const { data, error } = await supabase
    .from("vendors")
    .update(body)
    .eq("id", existing.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}
