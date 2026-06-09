import { STRIPE_CONFIG } from "../config";
import { verifyHmacSignature } from "../utils";
import type {
  InitializePaymentParams,
  InitializePaymentResult,
  VerifyPaymentParams,
  VerifyPaymentResult,
  RefundPaymentParams,
  RefundPaymentResult,
  WebhookPayload,
  WebhookProcessResult,
  PaymentStatus,
} from "@/types/payments";

export class StripeService {
  private readonly config = STRIPE_CONFIG;

  // ─── Create Payment Intent ──────────────────────────────────────────────────

  async initializePayment(
    params: InitializePaymentParams
  ): Promise<InitializePaymentResult> {
    try {
      const sessionId = `stripe_pi_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      // In production: POST to Stripe /payment_intents or /checkout/sessions
      // with amount (in smallest currency unit), currency, and metadata.
      const mockPaymentUrl = `${this.config.baseUrl}/checkout/sessions?session=${sessionId}&amount=${Math.round(params.amount * 100)}&currency=${params.currency.toLowerCase()}&success_url=${encodeURIComponent(params.returnUrl)}&cancel_url=${encodeURIComponent(params.cancelUrl)}`;

      return {
        success: true,
        paymentUrl: mockPaymentUrl,
        sessionId,
        transactionId: sessionId,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Stripe initialization failed",
      };
    }
  }

  // ─── Confirm Payment ─────────────────────────────────────────────────────────

  async verifyPayment(
    params: VerifyPaymentParams
  ): Promise<VerifyPaymentResult> {
    try {
      // In production: GET /payment_intents/{id} or /checkout/sessions/{id}
      // and map Stripe status to our PaymentStatus.
      const mockStatus: PaymentStatus = "completed";

      return {
        success: true,
        status: mockStatus,
        providerTransactionId: `stripe_ch_${params.sessionId}`,
      };
    } catch (error) {
      return {
        success: false,
        status: "failed",
        error: error instanceof Error ? error.message : "Stripe verification failed",
      };
    }
  }

  // ─── Refund Payment ─────────────────────────────────────────────────────────

  async refundPayment(
    params: RefundPaymentParams
  ): Promise<RefundPaymentResult> {
    try {
      // In production: POST /refunds with charge ID, amount, and reason
      const refundId = `stripe_re_${Date.now()}`;

      return {
        success: true,
        refundId,
        status: "refunded",
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Stripe refund failed",
      };
    }
  }

  // ─── Handle Webhook ─────────────────────────────────────────────────────────

  async handleWebhook(
    webhookPayload: WebhookPayload
  ): Promise<WebhookProcessResult> {
    try {
      // Stripe uses a timestamp-based signature: t=timestamp,v1=signature
      const isValid = await verifyHmacSignature(
        webhookPayload.rawBody,
        webhookPayload.signature,
        this.config.webhookSecret
      );

      if (!isValid) {
        return { success: false, error: "Invalid webhook signature" };
      }

      const payload = webhookPayload.payload;
      const eventType = webhookPayload.eventType;

      let status: PaymentStatus = "pending";

      // Map Stripe event types to our payment statuses
      if (
        eventType === "payment_intent.succeeded" ||
        eventType === "checkout.session.completed"
      ) {
        status = "completed";
      } else if (
        eventType === "payment_intent.payment_failed" ||
        eventType === "checkout.session.expired"
      ) {
        status = "failed";
      } else if (eventType === "charge.refunded") {
        status = "refunded";
      } else if (eventType === "payment_intent.canceled") {
        status = "cancelled";
      }

      const dataObject = payload.data as Record<string, unknown>;
      const obj = dataObject?.object as Record<string, unknown>;
      const transactionId = (obj?.id as string) || (obj?.payment_intent as string);

      return {
        success: true,
        transactionId,
        status,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Stripe webhook processing failed",
      };
    }
  }
}
