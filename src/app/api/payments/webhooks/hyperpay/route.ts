import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPaymentService } from "@/lib/payments/factory";
import type { WebhookPayload } from "@/types/payments";

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-hyperpay-signature") || "";
    const eventType = request.headers.get("x-hyperpay-event") || "payment.unknown";

    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    const supabase = await createClient();

    // Log the webhook
    await supabase.from("payment_webhooks").insert({
      provider: "hyperpay",
      event_type: eventType,
      payload,
    });

    const webhookPayload: WebhookPayload = {
      provider: "hyperpay",
      eventType,
      rawBody,
      signature,
      payload,
    };

    const service = getPaymentService("hyperpay");
    const result = await service.handleWebhook(webhookPayload);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // Update transaction and booking based on webhook status
    if (result.transactionId && result.status) {
      const { data: transaction } = await supabase
        .from("payment_transactions")
        .update({
          status: result.status,
          updated_at: new Date().toISOString(),
        })
        .eq("provider_transaction_id", result.transactionId)
        .select("booking_id")
        .single();

      if (transaction && result.status === "completed") {
        const qrCode = `SNX-${transaction.booking_id.slice(-8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
        await supabase
          .from("bookings")
          .update({
            status: "confirmed",
            payment_ref: result.transactionId,
            qr_code: qrCode,
            updated_at: new Date().toISOString(),
          })
          .eq("id", transaction.booking_id);
      }

      // Mark webhook as processed
      await supabase
        .from("payment_webhooks")
        .update({ processed: true, processed_at: new Date().toISOString() })
        .eq("provider", "hyperpay")
        .eq("event_type", eventType)
        .is("processed_at", null)
        .order("created_at", { ascending: false })
        .limit(1);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("HyperPay webhook error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
