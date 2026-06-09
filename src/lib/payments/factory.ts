import { HyperPayService } from "./services/hyperpay";
import { TabbyService } from "./services/tabby";
import { StripeService } from "./services/stripe";
import type {
  PaymentGateway,
  InitializePaymentParams,
  InitializePaymentResult,
  VerifyPaymentParams,
  VerifyPaymentResult,
  RefundPaymentParams,
  RefundPaymentResult,
  WebhookPayload,
  WebhookProcessResult,
} from "@/types/payments";

// ─── Unified Payment Service Interface ───────────────────────────────────────

export interface IPaymentService {
  initializePayment(params: InitializePaymentParams): Promise<InitializePaymentResult>;
  verifyPayment(params: VerifyPaymentParams): Promise<VerifyPaymentResult>;
  refundPayment(params: RefundPaymentParams): Promise<RefundPaymentResult>;
  handleWebhook(payload: WebhookPayload): Promise<WebhookProcessResult>;
}

// ─── Payment Factory ──────────────────────────────────────────────────────────

export class PaymentFactory {
  private static instances: Partial<Record<PaymentGateway, IPaymentService>> = {};

  static getService(gateway: PaymentGateway): IPaymentService {
    if (!this.instances[gateway]) {
      switch (gateway) {
        case "hyperpay":
          this.instances[gateway] = new HyperPayService();
          break;
        case "tabby":
          this.instances[gateway] = new TabbyService();
          break;
        case "stripe":
          this.instances[gateway] = new StripeService();
          break;
        default:
          throw new Error(`Unsupported payment gateway: ${gateway}`);
      }
    }
    return this.instances[gateway]!;
  }

  static getSupportedGateways(): PaymentGateway[] {
    return ["hyperpay", "tabby", "stripe"];
  }
}

// ─── Convenience Exports ──────────────────────────────────────────────────────

export function getPaymentService(gateway: PaymentGateway): IPaymentService {
  return PaymentFactory.getService(gateway);
}
