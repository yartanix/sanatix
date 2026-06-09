import { HYPERPAY_CONFIG } from "../config";
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

export class HyperPayService {
  private readonly config = HYPERPAY_CONFIG;

  // ─── Initialize Payment ─────────────────────────────────────────────────────

  async initializePayment(
    params: InitializePaymentParams
  ): Promise<InitializePaymentResult> {
    try {
      const sessionId = `hp_session_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      // In production: POST to HyperPay /checkouts to create a checkout session
      // and return the redirect URL with the checkout ID.
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
        error: error instanceof Error ? error.message : "HyperPay initialization failed",
      };
    }
  }

  // ─── Verify Payment ─────────────────────────────────────────────────────────

  async verifyPayment(
    params: VerifyPaymentParams
  ): Promise<VerifyPaymentResult> {
    try {
      // In production: GET /checkouts/{id}/payment to retrieve payment status
      // and map HyperPay result codes to our PaymentStatus.
      const mockStatus: PaymentStatus = "completed";

      return {
        success: true,
        status: mockStatus,
        providerTransactionId: `hp_txn_${params.sessionId}`,
      };
    } catch (error) {
      return {
        success: false,
        status: "failed",
        error: error instanceof Error ? error.message : "HyperPay verification failed",
      };
    }
  }

  // ─── Refund Payment ─────────────────────────────────────────────────────────

  async refundPayment(
    params: RefundPaymentParams
  ): Promise<RefundPaymentResult> {
    try {
      // In production: POST /payments/{id}/refunds with amount and reason
      const refundId = `hp_refund_${Date.now()}`;

      return {
        success: true,
        refundId,
        status: "refunded",
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "HyperPay refund failed",
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

      // Map HyperPay event types to our payment statuses
      if (eventType === "payment.completed" || eventType === "payment.captured") {
        status = "completed";
      } else if (eventType === "payment.failed" || eventType === "payment.declined") {
        status = "failed";
      } else if (eventType === "payment.refunded") {
        status = "refunded";
      } else if (eventType === "payment.cancelled") {
        status = "cancelled";
      }

      const transactionId = (payload.checkoutId as string) || (payload.id as string);

      return {
        success: true,
        transactionId,
        status,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "HyperPay webhook processing failed",
      };
    }
  }
}
