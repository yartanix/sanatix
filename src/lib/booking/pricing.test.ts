import { describe, it, expect } from "vitest";
import {
  getAvailableTickets,
  clampQuantity,
  calculateTotalItems,
  calculateBookingTotal,
  buildBookingItems,
  type TicketTypeForPricing,
} from "./pricing";

function ticket(overrides: Partial<TicketTypeForPricing> = {}): TicketTypeForPricing {
  return {
    id: "tt-1",
    price: 100,
    currency: "SAR",
    total_quantity: 50,
    sold_quantity: 0,
    status: "available",
    ...overrides,
  };
}

describe("getAvailableTickets", () => {
  it("excludes sold-out ticket types", () => {
    const tickets = [ticket({ id: "a", total_quantity: 10, sold_quantity: 10 }), ticket({ id: "b" })];
    expect(getAvailableTickets(tickets).map((t) => t.id)).toEqual(["b"]);
  });

  it("excludes ticket types not marked 'available'", () => {
    const tickets = [ticket({ id: "a", status: "draft" }), ticket({ id: "b", status: "available" })];
    expect(getAvailableTickets(tickets).map((t) => t.id)).toEqual(["b"]);
  });

  it("keeps a ticket type with exactly one seat left", () => {
    const tickets = [ticket({ id: "a", total_quantity: 10, sold_quantity: 9 })];
    expect(getAvailableTickets(tickets)).toHaveLength(1);
  });
});

describe("clampQuantity", () => {
  it("never goes below zero", () => {
    expect(clampQuantity(0, -1)).toBe(0);
    expect(clampQuantity(3, -10)).toBe(0);
  });

  it("never exceeds the per-ticket-type cap of 10 by default", () => {
    expect(clampQuantity(10, 1)).toBe(10);
    expect(clampQuantity(5, 100)).toBe(10);
  });

  it("respects a lower explicit max (e.g. remaining stock)", () => {
    expect(clampQuantity(2, 5, 3)).toBe(3);
  });

  it("increments and decrements normally within bounds", () => {
    expect(clampQuantity(2, 1)).toBe(3);
    expect(clampQuantity(2, -1)).toBe(1);
  });
});

describe("calculateTotalItems", () => {
  it("sums quantities across ticket types", () => {
    expect(calculateTotalItems({ a: 2, b: 3 })).toBe(5);
  });

  it("returns 0 for an empty selection", () => {
    expect(calculateTotalItems({})).toBe(0);
  });
});

describe("calculateBookingTotal — this is literally what the buyer is charged", () => {
  it("is zero with nothing selected", () => {
    const tickets = [ticket({ id: "a", price: 150 })];
    expect(calculateBookingTotal(tickets, {})).toBe(0);
  });

  it("multiplies price by quantity for a single ticket type", () => {
    const tickets = [ticket({ id: "a", price: 150 })];
    expect(calculateBookingTotal(tickets, { a: 3 })).toBe(450);
  });

  it("sums correctly across multiple ticket types at different prices", () => {
    const tickets = [ticket({ id: "a", price: 150 }), ticket({ id: "b", price: 75 })];
    expect(calculateBookingTotal(tickets, { a: 2, b: 4 })).toBe(150 * 2 + 75 * 4);
  });

  it("free tickets (price 0) contribute nothing even with a quantity", () => {
    const tickets = [ticket({ id: "a", price: 0 })];
    expect(calculateBookingTotal(tickets, { a: 5 })).toBe(0);
  });

  it("ignores a quantity entry for a ticket type that isn't in the list", () => {
    // Guards against a stale quantities object (e.g. from a ticket type
    // that sold out and dropped out of `availableTickets`) silently still
    // being charged for.
    const tickets = [ticket({ id: "a", price: 100 })];
    expect(calculateBookingTotal(tickets, { a: 1, "stale-id": 99 })).toBe(100);
  });
});

describe("buildBookingItems", () => {
  it("drops zero-quantity entries before they ever reach the booking API", () => {
    const items = buildBookingItems({ a: 2, b: 0, c: 1 });
    expect(items).toEqual([
      { ticket_type_id: "a", quantity: 2 },
      { ticket_type_id: "c", quantity: 1 },
    ]);
  });

  it("returns an empty array for an all-zero selection", () => {
    expect(buildBookingItems({ a: 0, b: 0 })).toEqual([]);
  });
});
