import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

async function assertOwnsEvent(
  supabase: Awaited<ReturnType<typeof createClient>>,
  eventId: string,
  userId: string
) {
  const { data } = await supabase
    .from("events")
    .select("id")
    .eq("id", eventId)
    .eq("organizer_id", userId)
    .single();
  return !!data;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!(await assertOwnsEvent(supabase, id, user.id))) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("ticket_types")
    .select("*")
    .eq("event_id", id)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!(await assertOwnsEvent(supabase, id, user.id))) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const body = await req.json();
  delete body.id;
  delete body.event_id;
  delete body.sold_quantity; // sold_quantity is only ever changed by the booking RPC

  const { data, error } = await supabase
    .from("ticket_types")
    .insert({ ...body, event_id: id })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data, { status: 201 });
}
