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

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; ticketId: string }> }
) {
  const { id, ticketId } = await params;
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
    .update(body)
    .eq("id", ticketId)
    .eq("event_id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; ticketId: string }> }
) {
  const { id, ticketId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!(await assertOwnsEvent(supabase, id, user.id))) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  // Refuse to delete a ticket type that already has sales — the
  // booking history needs it to stay around for reporting.
  const { data: ticket } = await supabase
    .from("ticket_types")
    .select("sold_quantity")
    .eq("id", ticketId)
    .eq("event_id", id)
    .single();

  if (ticket && ticket.sold_quantity > 0) {
    return NextResponse.json(
      { error: "Cannot delete a ticket type with existing sales. Set it to sold_out instead." },
      { status: 409 }
    );
  }

  const { error } = await supabase
    .from("ticket_types")
    .delete()
    .eq("id", ticketId)
    .eq("event_id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ deleted: true });
}
