import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { getPaymentService } from "@/lib/payments/factory";
import { calculateCommission, generateTransactionRef, validatePaymentAmount } from "@/lib/payments/utils";
import type { PaymentGateway, SupportedCurrency } from "@/types/payments";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { booking_id, payment_method } = body as {
      booking_id: string;
      payment_method: PaymentGateway;
    };

    if (!booking_id || !payment_method) {
      return NextResponse.json(
        { error: "booking_id and payment_method are required" },
        { status: 400 }
      );
    }

    // Fetch booking details
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select(`
        *,
        events(title_en, title_ar),
        ticket_types(name_en, name_ar)
      `)
      .eq("id", booking_id)
      .eq("user_id", user.id)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (booking.status !== "pending") {
      return NextResponse.json(
        { error: "Booking is not in a payable state" },
        { status: 400 }
      );
    }

    if (!validatePaymentAmount(booking.total_amount)) {
      return NextResponse.json({ error: "Invalid payment amount" }, { status: 400 });
    }

    const origin = request.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const commission = calculateCommission(booking.total_amount);
    const grandTotal = booking.total_amount + commission;

    // Fetch user profile for customer details
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, phone")
      .eq("id", user.id)
      .single();

    const paymentService = getPaymentService(payment_method);
    const result = await paymentService.initializePayment({
      bookingId: booking_id,
      userId: user.id,
      amount: grandTotal,
      currency: booking.currency as SupportedCurrency,
      paymentMethod: payment_method,
      returnUrl: `${origin}/payments/confirmation?booking_id=${booking_id}&session_id={SESSION_ID}`,
      cancelUrl: `${origin}/payments/checkout?booking_id=${booking_id}&cancelled=true`,
      customerEmail: user.email,
      customerName: profile?.full_name || undefined,
      customerPhone: profile?.phone || undefined,
      description: `Sanatix — ${booking.events?.title_en || "Event Ticket"}`,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Payment initialization failed" },
        { status: 500 }
      );
    }

    // Create transaction record
    const transactionRef = generateTransactionRef();
    const { data: transaction, error: txError } = await supabase
      .from("payment_transactions")
      .insert({
        booking_id,
        user_id: user.id,
        amount: grandTotal,
        currency: booking.currency,
        payment_method,
        provider: payment_method,
        provider_transaction_id: result.transactionId,
        status: "pending",
        payment_details: {
          session_id: result.sessionId,
          transaction_ref: transactionRef,
          commission,
          base_amount: booking.total_amount,
        },
      })
      .select()
      .single();

    if (txError) {
      console.error("Failed to create transaction record:", txError);
    }

    return NextResponse.json({
      success: true,
      payment_url: result.paymentUrl,
      session_id: result.sessionId,
      transaction_id: transaction?.id,
    });
  } catch (error) {
    console.error("Payment initialization error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
