import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

interface Params {
  params: Promise<{ id: string }>;
}

// Host's own dashboard view of one party: the party plus every guest's
// current RSVP status. RLS already scopes "parties"/"party_guests" to
// rows this user hosts, so a party that isn't theirs just comes back
// empty rather than needing an extra ownership check here.
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: party, error: partyError } = await supabase
    .from("parties")
    .select("*")
    .eq("id", id)
    .eq("host_id", user.id)
    .single();

  if (partyError || !party) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: guests, error: guestsError } = await supabase
    .from("party_guests")
    .select("*")
    .eq("party_id", id)
    .order("created_at", { ascending: true });

  if (guestsError) return NextResponse.json({ error: guestsError.message }, { status: 500 });

  return NextResponse.json({ party, guests });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await supabase.from("parties").delete().eq("id", id).eq("host_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
