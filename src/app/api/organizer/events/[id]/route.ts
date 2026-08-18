import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("events")
    .select("*, ticket_types(*)")
    .eq("id", id)
    .eq("organizer_id", user.id)
    .single();

  if (error) return NextResponse.json({ error: "Event not found" }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  // organizer_id and id must never be overwritten via the request body
  delete body.id;
  delete body.organizer_id;

  const { data, error } = await supabase
    .from("events")
    .update(body)
    .eq("id", id)
    .eq("organizer_id", user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Block deletion once tickets have sold — cancel instead, so paid
  // customers don't lose their booking history.
  const { data: sold } = await supabase
    .from("ticket_types")
    .select("sold_quantity")
    .eq("event_id", id)
    .gt("sold_quantity", 0)
    .limit(1);

  if (sold && sold.length > 0) {
    const { data, error } = await supabase
      .from("events")
      .update({ status: "cancelled" })
      .eq("id", id)
      .eq("organizer_id", user.id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ cancelled: true, event: data });
  }

  const { error } = await supabase
    .from("events")
    .delete()
    .eq("id", id)
    .eq("organizer_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ deleted: true });
}
