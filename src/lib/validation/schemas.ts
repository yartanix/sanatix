// Shared request-validation schemas for routes that touch money or a
// guest's RSVP — pulled out of the route files so the validation
// boundaries themselves (what's rejected vs. accepted) can be unit
// tested directly, without spinning up a request/response cycle.
import { z } from "zod";

export const rsvpTokenSchema = z.string().uuid();

export const rsvpSubmitSchema = z.object({
  status: z.enum(["yes", "no", "maybe"]),
  guestCount: z.number().int().min(1).max(20).optional(),
});

export const bookingItemSchema = z.object({
  ticket_type_id: z.string().uuid(),
  quantity: z.number().int().min(1).max(10),
});

export const bookingRequestSchema = z.object({
  items: z.array(bookingItemSchema).min(1).max(20),
});
