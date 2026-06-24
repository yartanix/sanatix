import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { getPaymentService } from "@/lib/payments/factory";
import { canRefund } from "@/lib/payments/utils";
import type { PaymentGateway, PaymentTransaction } from "@/types/payments";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { transaction_id, reason, amount } = body as {
      transaction_id: string;
      reason: string;
      amount?: number;
    };

    if (!transaction_id || !reason) {
      return NextResponse.json(
        { error: "transaction_id and reason are required" },
        { status: 400 }
      );
    }

    // Fetch transaction
    const { data: transaction, error: txError } = await supabase
      .from("payment_transactions")
      .select("*")
      .eq("id", transaction_id)
      .eq("user_id", user.id)
      .single();

    if (txError || !transaction) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    if (!canRefund(transaction as PaymentTransaction)) {
      return NextResponse.json(
        { error: "Transaction is not eligible for refund" },
        { status: 400 }
      );
    }

    const refundAmount = amount || transaction.amount;
    const paymentService = getPaymentService(transaction.provider as PaymentGateway);

    const result = await paymentService.refundPayment({
      transactionId: transaction.provider_transaction_id || transaction.id,
      amount: refundAmount,
      reason,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Refund failed" },
        { status: 500 }
      );
    }

    const now = new Date().toISOString();

    // Update transaction record
    await supabase
      .from("payment_transactions")
      .update({
        status: "refunded",
        refund_amount: refundAmount,
        refund_reason: reason,
        refunded_at: now,
        updated_at: now,
      })
      .eq("id", transaction_id);

    // Update booking status
    await supabase
      .from("bookings")
      .update({
        status: "refunded",
        updated_at: now,
      })
      .eq("id", transaction.booking_id);

    return NextResponse.json({
      success: true,
      refund_status: "refunded",
      refund_id: result.refundId,
      refund_amount: refundAmount,
    });
  } catch (error) {
    console.error("Refund error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
