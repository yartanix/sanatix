// Pure, DB-free booking math — extracted from TicketSelector.tsx so the
// actual money calculation a user sees before paying can be unit tested
// without rendering a component or hitting Supabase. The real source of
// truth for stock and the final charged amount is still the
// create_bookings() Postgres function (migration 002) — this is what
// decides what the UI *shows* the user before they commit to booking, and
// it has to agree with what the server will actually charge.

export interface TicketTypeForPricing {
  id: string;
  price: number;
  currency: string;
  total_quantity: number;
  sold_quantity: number;
  status: string;
}

export type Quantities = Record<string, number>;

const MAX_PER_TICKET_TYPE = 10;

/** Ticket types a buyer can currently select from — on sale and in stock. */
export function getAvailableTickets<T extends TicketTypeForPricing>(ticketTypes: T[]): T[] {
  return ticketTypes.filter((tt) => tt.status === "available" && tt.sold_quantity < tt.total_quantity);
}

/**
 * Clamps a quantity change to [0, 10] — mirrors the +/- stepper in
 * TicketSelector.tsx. Does NOT clamp to remaining stock on its own; pass
 * the ticket's actual remaining count as `max` to also enforce that
 * (the UI additionally disables the "+" button once `qty >= remaining`,
 * but the clamp here is what actually prevents the value going higher
 * even if that's bypassed).
 */
export function clampQuantity(current: number, delta: number, max: number = MAX_PER_TICKET_TYPE): number {
  return Math.max(0, Math.min(max, current + delta));
}

/** Total number of tickets selected, across all ticket types. */
export function calculateTotalItems(quantities: Quantities): number {
  return Object.values(quantities).reduce((a, b) => a + b, 0);
}

/**
 * Total amount a selection of tickets will cost. This is what the UI
 * displays before booking — the server (create_bookings()) computes the
 * authoritative charge independently from the same ticket_type prices, so
 * a mismatch between this and the server total would mean someone sees
 * one number and gets charged another.
 */
export function calculateBookingTotal(ticketTypes: TicketTypeForPricing[], quantities: Quantities): number {
  return ticketTypes.reduce((sum, tt) => sum + (quantities[tt.id] ?? 0) * tt.price, 0);
}

/** Builds the exact request body TicketSelector sends to POST /api/bookings. */
export function buildBookingItems(quantities: Quantities): { ticket_type_id: string; quantity: number }[] {
  return Object.entries(quantities)
    .filter(([, quantity]) => quantity > 0)
    .map(([ticket_type_id, quantity]) => ({ ticket_type_id, quantity }));
}
