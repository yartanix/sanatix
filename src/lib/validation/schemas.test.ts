import { describe, it, expect } from "vitest";
import { rsvpTokenSchema, rsvpSubmitSchema, bookingItemSchema, bookingRequestSchema } from "./schemas";

describe("rsvpTokenSchema — the only thing standing between a guest and someone else's RSVP row", () => {
  it("accepts a well-formed uuid", () => {
    expect(rsvpTokenSchema.safeParse("3fa85f64-5717-4562-b3fc-2c963f66afa6").success).toBe(true);
  });

  it("rejects a non-uuid string", () => {
    expect(rsvpTokenSchema.safeParse("not-a-token").success).toBe(false);
  });

  it("rejects an empty string, and a guessable sequential id", () => {
    expect(rsvpTokenSchema.safeParse("").success).toBe(false);
    expect(rsvpTokenSchema.safeParse("1").success).toBe(false);
  });

  it("rejects attempted SQL/path injection through the token param", () => {
    expect(rsvpTokenSchema.safeParse("' OR 1=1--").success).toBe(false);
    expect(rsvpTokenSchema.safeParse("../../etc/passwd").success).toBe(false);
  });
});

describe("rsvpSubmitSchema", () => {
  it("accepts each valid status with no guest count (defaults handled by the route)", () => {
    for (const status of ["yes", "no", "maybe"] as const) {
      expect(rsvpSubmitSchema.safeParse({ status }).success).toBe(true);
    }
  });

  it("rejects a status outside the allowed set", () => {
    expect(rsvpSubmitSchema.safeParse({ status: "definitely" }).success).toBe(false);
    expect(rsvpSubmitSchema.safeParse({ status: "pending" }).success).toBe(false);
  });

  it("accepts a guest count within [1, 20]", () => {
    expect(rsvpSubmitSchema.safeParse({ status: "yes", guestCount: 1 }).success).toBe(true);
    expect(rsvpSubmitSchema.safeParse({ status: "yes", guestCount: 20 }).success).toBe(true);
  });

  it("rejects a guest count outside [1, 20] — guards the same bound as the Postgres function", () => {
    expect(rsvpSubmitSchema.safeParse({ status: "yes", guestCount: 0 }).success).toBe(false);
    expect(rsvpSubmitSchema.safeParse({ status: "yes", guestCount: 21 }).success).toBe(false);
    expect(rsvpSubmitSchema.safeParse({ status: "yes", guestCount: -5 }).success).toBe(false);
  });

  it("rejects a non-integer guest count", () => {
    expect(rsvpSubmitSchema.safeParse({ status: "yes", guestCount: 2.5 }).success).toBe(false);
  });

  it("rejects a missing status entirely", () => {
    expect(rsvpSubmitSchema.safeParse({}).success).toBe(false);
  });
});

describe("bookingItemSchema", () => {
  it("accepts a valid ticket_type_id + quantity in [1, 10]", () => {
    expect(
      bookingItemSchema.safeParse({ ticket_type_id: "3fa85f64-5717-4562-b3fc-2c963f66afa6", quantity: 1 }).success
    ).toBe(true);
  });

  it("rejects a quantity of 0 or below", () => {
    expect(
      bookingItemSchema.safeParse({ ticket_type_id: "3fa85f64-5717-4562-b3fc-2c963f66afa6", quantity: 0 }).success
    ).toBe(false);
  });

  it("rejects a quantity above 10 — the same cap the UI enforces client-side", () => {
    expect(
      bookingItemSchema.safeParse({ ticket_type_id: "3fa85f64-5717-4562-b3fc-2c963f66afa6", quantity: 11 }).success
    ).toBe(false);
  });

  it("rejects a non-uuid ticket_type_id", () => {
    expect(bookingItemSchema.safeParse({ ticket_type_id: "whatever", quantity: 1 }).success).toBe(false);
  });
});

describe("bookingRequestSchema", () => {
  const validItem = { ticket_type_id: "3fa85f64-5717-4562-b3fc-2c963f66afa6", quantity: 2 };

  it("accepts a request with at least one item", () => {
    expect(bookingRequestSchema.safeParse({ items: [validItem] }).success).toBe(true);
  });

  it("rejects an empty items array — you can't book nothing", () => {
    expect(bookingRequestSchema.safeParse({ items: [] }).success).toBe(false);
  });

  it("rejects more than 20 line items in one request", () => {
    const items = Array.from({ length: 21 }, () => validItem);
    expect(bookingRequestSchema.safeParse({ items }).success).toBe(false);
  });

  it("rejects a malformed item anywhere in the array, not just the first", () => {
    const items = [validItem, { ticket_type_id: "not-a-uuid", quantity: 1 }];
    expect(bookingRequestSchema.safeParse({ items }).success).toBe(false);
  });
});
