/**
 * Provider-agnostic payment abstraction.
 *
 * Status (Nov 2026): no payment provider is live. Bookings and campaign
 * contributions currently only ever reach `status: 'pending'` /
 * `payment_ref: null` — nothing in the app charges a card yet. This file
 * defines the shape any provider (Lite, or a future fallback) must
 * implement, so the booking/contribution flows can be wired to a real
 * charge without re-designing them later.
 *
 * Lite (lite.sa) is the provider being pursued — see the Nov 5 outreach
 * to Mohamed at Lite requesting sandbox access for ticket purchases,
 * vendor payouts, and refunds. `providers/lite.ts` is a stub against this
 * interface; it throws until real sandbox credentials are configured.
 *
 * Deliberately NOT included here: a payment-provider-specific concept of
 * "card", "wallet", etc. Everything is expressed in terms of the three
 * operations Sanatix actually needs (charge, refund, payout), so swapping
 * providers later doesn't require touching call sites.
 */

export type PaymentCurrency = "SAR" | "AED" | "QAR" | "BHD" | "KWD" | "OMR" | "USD";

/** Mirrors `bookings.status` / `campaign` fulfillment semantics, not provider-specific jargon. */
export type PaymentOutcome = "succeeded" | "failed" | "pending";

export interface ChargeRequest {
  /** `bookings.id` or `contributions.id` — stored back as part of `payment_ref` so a charge is traceable to one row. */
  referenceId: string;
  /** Smallest currency unit is NOT assumed — amount is a decimal major-unit number, matching `bookings.total_amount` / `contributions.amount` in the DB today. */
  amount: number;
  currency: PaymentCurrency;
  /** Free-form description shown on the provider's dashboard / the payer's statement, e.g. "Sanatix booking SNX-ABC123". */
  description: string;
  /** For idempotency: calling createCharge twice with the same key must not double-charge. */
  idempotencyKey: string;
}

export interface ChargeResult {
  outcome: PaymentOutcome;
  /** Provider's own charge/transaction id — this is what gets written into `bookings.payment_ref` / `contributions.payment_ref`. */
  providerRef: string;
  /** Present when outcome is "pending" and the payer must be redirected to complete payment (3DS, provider-hosted checkout, etc). */
  redirectUrl?: string;
  failureReason?: string;
}

export interface RefundRequest {
  /** The providerRef from the original ChargeResult, i.e. the value already stored in `payment_ref`. */
  providerRef: string;
  /** Omit for a full refund. */
  amount?: number;
  reason?: string;
}

export interface RefundResult {
  outcome: PaymentOutcome;
  providerRefundRef: string;
  failureReason?: string;
}

export interface PayoutRequest {
  /** `vendors.id` or `venues.id` — whichever party is being paid out. */
  recipientId: string;
  amount: number;
  currency: PaymentCurrency;
  description: string;
  idempotencyKey: string;
}

export interface PayoutResult {
  outcome: PaymentOutcome;
  providerRef: string;
  failureReason?: string;
}

export interface PaymentProvider {
  readonly name: string;
  createCharge(req: ChargeRequest): Promise<ChargeResult>;
  refund(req: RefundRequest): Promise<RefundResult>;
  /** Vendor/venue payouts — named in the Lite outreach but not used by any current code path (no payout UI/flow exists yet). Included so the interface doesn't need a breaking change once one does. */
  createPayout(req: PayoutRequest): Promise<PayoutResult>;
}

/** Thrown by a provider stub when credentials/configuration aren't available yet — distinguishes "not configured" from a real provider-side failure so callers (and error tracking) don't confuse the two. */
export class PaymentProviderNotConfiguredError extends Error {
  constructor(providerName: string, detail: string) {
    super(`${providerName} payment provider is not configured: ${detail}`);
    this.name = "PaymentProviderNotConfiguredError";
  }
}
