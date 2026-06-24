import { TABBY_CONFIG } from "../config";
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

export class TabbyService {
  private readonly config = TABBY_CONFIG;

  // ─── Create Checkout Session ────────────────────────────────────────────────

  async initializePayment(
    params: InitializePaymentParams
  ): Promise<InitializePaymentResult> {
    try {
      const sessionId = `tabby_session_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      // In production: POST to Tabby /checkout to create a BNPL session.
      // Tabby requires order items, buyer info, and shipping address.
      const mockPaymentUrl = `${this.config.baseUrl}/checkout?session=${sessionId}&amount=${params.amount}&currency=${params.currency}&return_url=${encodeURIComponent(params.returnUrl)}`;

      return {
        success: true,
        paymentUrl: mockPaymentUrl,
        sessionId,
        transactionId: sessionId,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Tabby initialization failed",
      };
    }
  }

  // ─── Verify Payment ─────────────────────────────────────────────────────────

  async verifyPayment(
    params: VerifyPaymentParams
  ): Promise<VerifyPaymentResult> {
    try {
      // In production: GET /payments/{id} to retrieve Tabby payment status
      const mockStatus: PaymentStatus = "completed";

      return {
        success: true,
        status: mockStatus,
        providerTransactionId: `tabby_txn_${params.sessionId}`,
      };
    } catch (error) {
      return {
        success: false,
        status: "failed",
        error: error instanceof Error ? error.message : "Tabby verification failed",
      };
    }
  }

  // ─── Refund Payment ─────────────────────────────────────────────────────────

  async refundPayment(
    params: RefundPaymentParams
  ): Promise<RefundPaymentResult> {
    try {
      // In production: POST /payments/{id}/captures/{capture_id}/refunds
      const refundId = `tabby_refund_${Date.now()}`;

      return {
        success: true,
        refundId,
        status: "refunded",
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Tabby refund failed",
      };
    }
  }

  // ─── Handle Webhook ─────────────────────────────────────────────────────────

  async handleWebhook(
    webhookPayload: WebhookPayload
  ): Promise<WebhookProcessResult> {
    try {
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

      // Map Tabby event types to our payment statuses
      if (eventType === "payment.authorized" || eventType === "payment.captured") {
        status = "completed";
      } else if (eventType === "payment.rejected" || eventType === "payment.expired") {
        status = "failed";
      } else if (eventType === "payment.refunded") {
        status = "refunded";
      } else if (eventType === "payment.closed") {
        status = "cancelled";
      }

      const transactionId = (payload.id as string) || (payload.payment_id as string);

      return {
        success: true,
        transactionId,
        status,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Tabby webhook processing failed",
      };
    }
  }
}
