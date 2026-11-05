import { PaymentProvider } from "./types";
import { LiteProvider } from "./providers/lite";

export * from "./types";

let cachedProvider: PaymentProvider | undefined;

/**
 * Returns the active payment provider. Today there's exactly one
 * candidate (Lite), so this isn't a real multi-provider registry yet —
 * it's written as a factory anyway so adding a second provider later
 * (or a feature flag to pick one) doesn't require changing call sites.
 *
 * No route or server action calls this today. It exists so the booking
 * (`/api/bookings`, `create_bookings()` RPC) and contribution
 * (`/api/campaigns/[id]/contributions`) flows have a known seam to wire
 * into once Lite sandbox credentials arrive — wiring that up is a
 * follow-up change, not part of this scaffolding.
 */
export function getPaymentProvider(): PaymentProvider {
  if (!cachedProvider) {
    cachedProvider = new LiteProvider();
  }
  return cachedProvider;
}
