import { describe, it, expect } from "vitest";
import { clampPagination } from "./pagination";

describe("clampPagination — unbounded ?limit=/?page= as a resource-exhaustion knob", () => {
  const opts = { defaultLimit: 12, maxLimit: 50 };

  it("defaults page=1 and the configured default limit when absent", () => {
    expect(clampPagination(null, null, opts)).toEqual({ page: 1, limit: 12, offset: 0 });
  });

  it("caps an oversized limit at maxLimit instead of passing it through", () => {
    expect(clampPagination("1", "999999999", opts)).toEqual({ page: 1, limit: 50, offset: 0 });
  });

  it("falls back to defaultLimit for a zero or negative limit", () => {
    expect(clampPagination("1", "0", opts).limit).toBe(12);
    expect(clampPagination("1", "-5", opts).limit).toBe(12);
  });

  it("falls back to page 1 for a zero, negative, or non-numeric page", () => {
    expect(clampPagination("0", "12", opts).page).toBe(1);
    expect(clampPagination("-3", "12", opts).page).toBe(1);
    expect(clampPagination("not-a-number", "12", opts).page).toBe(1);
  });

  it("computes offset from the clamped page/limit, not the raw input", () => {
    expect(clampPagination("3", "20", opts)).toEqual({ page: 3, limit: 20, offset: 40 });
  });
});
