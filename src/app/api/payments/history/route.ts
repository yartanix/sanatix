import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import type { PaymentStatus, PaymentGateway } from "@/types/payments";

// GET /api/payments/history — paginated transaction history with filters
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as PaymentStatus | null;
    const provider = searchParams.get("provider") as PaymentGateway | null;
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");
    const page = parseInt(searchParams.get("page") ?? "1", 10);
    const limit = parseInt(searchParams.get("limit") ?? "10", 10);
    const offset = (page - 1) * limit;

    let query = supabase
      .from("payment_transactions")
      .select(
        `
        *,
        bookings(
          id,
          quantity,
          events(title_ar, title_en, starts_at, venue_city),
          ticket_types(name_ar, name_en)
        )
      `,
        { count: "exact" }
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) query = query.eq("status", status);
    if (provider) query = query.eq("provider", provider);
    if (startDate) query = query.gte("created_at", startDate);
    if (endDate) query = query.lte("created_at", endDate);

    const { data: transactions, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      transactions: transactions || [],
      total: count ?? 0,
      page,
      limit,
      pages: Math.ceil((count ?? 0) / limit),
    });
  } catch (error) {
    console.error("Payment history error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
