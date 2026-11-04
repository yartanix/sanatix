import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { bookingRequestSchema } from "@/lib/validation/schemas";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const json = await req.json().catch(() => null);
  const parsed = bookingRequestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 }
    );
  }

  // create_bookings() is a Postgres function (see
  // supabase/migrations/002_ticket_management_and_bookings.sql) that locks
  // each ticket_type row, checks remaining stock, increments sold_quantity,
  // and inserts the booking rows all inside one transaction — so concurrent
  // requests for the same last tickets can't both succeed.
  const { data, error } = await supabase.rpc("create_bookings", {
    items: parsed.data.items,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ bookings: data }, { status: 201 });
}
