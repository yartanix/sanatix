import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { getPaymentService } from "@/lib/payments/factory";
import type { PaymentGateway } from "@/types/payments";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { session_id, transaction_id, provider } = body as {
      session_id: string;
      transaction_id?: string;
      provider: PaymentGateway;
    };

    if (!session_id || !provider) {
      return NextResponse.json(
        { error: "session_id and provider are required" },
        { status: 400 }
      );
    }

    // Fetch transaction record
    let txQuery = supabase
      .from("payment_transactions")
      .select("*")
      .eq("user_id", user.id);

    if (transaction_id) {
      txQuery = txQuery.eq("id", transaction_id);
    } else {
      txQuery = txQuery.eq("provider_transaction_id", session_id);
    }

    const { data: transaction } = await txQuery.single();

    if (!transaction) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    const paymentService = getPaymentService(provider);
    const result = await paymentService.verifyPayment({
      sessionId: session_id,
      transactionId: transaction_id,
      provider,
    });

    // Update transaction status
    await supabase
      .from("payment_transactions")
      .update({
        status: result.status,
        provider_transaction_id: result.providerTransactionId || transaction.provider_transaction_id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", transaction.id);

    // If payment completed, confirm the booking
    if (result.status === "completed") {
      const qrCode = `SNX-${transaction.booking_id.slice(-8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
      await supabase
        .from("bookings")
        .update({
          status: "confirmed",
          payment_ref: result.providerTransactionId || session_id,
          qr_code: qrCode,
          updated_at: new Date().toISOString(),
        })
        .eq("id", transaction.booking_id);
    } else if (result.status === "failed" || result.status === "cancelled") {
      await supabase
        .from("bookings")
        .update({
          status: "cancelled",
          updated_at: new Date().toISOString(),
        })
        .eq("id", transaction.booking_id);
    }

    return NextResponse.json({
      success: result.success,
      payment_status: result.status,
      booking_status: result.status === "completed" ? "confirmed" : "pending",
      transaction_id: transaction.id,
      booking_id: transaction.booking_id,
      error: result.error,
    });
  } catch (error) {
    console.error("Payment verification error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
