import {
  ChargeRequest,
  ChargeResult,
  PaymentProvider,
  PaymentProviderNotConfiguredError,
  PayoutRequest,
  PayoutResult,
  RefundRequest,
  RefundResult,
} from "../types";

/**
 * Stub for Lite (lite.sa), a KSA payment provider. Real sandbox API
 * access was requested from Lite (contact: Mohamed, mohamed@lite.sa) on
 * Nov 5 2026 for ticket purchases, vendor payouts, and refunds — no
 * reply/credentials yet as of this file being written.
 *
 * This class deliberately does NOT guess at Lite's actual request/response
 * shape (endpoint paths, auth scheme, field names). Every method throws
 * PaymentProviderNotConfiguredError until LITE_API_KEY is set, at which
 * point each method body should be replaced with real calls per Lite's
 * API docs — nothing here should be trusted as "the Lite API contract"
 * in the meantime.
 */
export class LiteProvider implements PaymentProvider {
  readonly name = "lite";

  private readonly apiKey: string | undefined;

  constructor() {
    this.apiKey = process.env.LITE_API_KEY;
  }

  private requireConfigured(): void {
    if (!this.apiKey) {
      throw new PaymentProviderNotConfiguredError(
        this.name,
        "LITE_API_KEY is not set — Lite sandbox credentials haven't arrived yet (see Nov 5 2026 outreach to mohamed@lite.sa). " +
          "Nothing calls this provider in production code paths yet; this stub exists so the booking/contribution flows have a real interface to target once credentials land."
      );
    }
  }

  async createCharge(_req: ChargeRequest): Promise<ChargeResult> {
    this.requireConfigured();
    throw new Error("LiteProvider.createCharge: not implemented — replace this stub once Lite's API docs/credentials are available.");
  }

  async refund(_req: RefundRequest): Promise<RefundResult> {
    this.requireConfigured();
    throw new Error("LiteProvider.refund: not implemented — replace this stub once Lite's API docs/credentials are available.");
  }

  async createPayout(_req: PayoutRequest): Promise<PayoutResult> {
    this.requireConfigured();
    throw new Error("LiteProvider.createPayout: not implemented — replace this stub once Lite's API docs/credentials are available.");
  }
}
