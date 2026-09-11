import { NextRequest, NextResponse } from "next/server";
import { runContentAgent, summarizeRun, type SweepScope } from "@/lib/agents/content-agent";
import { startAgentRun, finishAgentRun } from "@/lib/agents/run-log";

export const maxDuration = 300; // seconds — several web-search-grounded Claude calls per run
export const dynamic = "force-dynamic";

// Day of week (UTC, 0 = Sunday) on which the daily cron also sweeps the
// non-Saudi GCC cities. Thursday: catches weekend announcements before
// the Fri/Sat weekend across the Gulf.
const GCC_WEEKDAY = 4;

/**
 * Content agent v2 entry point.
 *
 * Triggered by Vercel Cron daily (see vercel.json). Scope:
 *   - every day:      KSA cities (events) + 1 rotating KSA city (venues)
 *   - GCC_WEEKDAY:    additionally the 5 GCC cities (events) + 1 rotating
 *                     GCC city (venues)
 *
 * Manual overrides (all optional, for testing from curl / the Vercel UI):
 *   ?scope=ksa|gcc         force the scope regardless of weekday
 *   ?city=Riyadh,Jeddah    restrict to specific cities (venues + events)
 *   ?events=5&venues=5     per-city counts
 *   ?venues=0              skip the venue pass;   ?vendors=0 skips vendors
 *
 * Auth: Vercel sends `Authorization: Bearer $CRON_SECRET` on cron
 * requests once CRON_SECRET is set; manual calls need the same header.
 */
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } else {
    console.warn("[content-agent] CRON_SECRET is not set — route is unauthenticated. Set it before going live.");
  }

  const startedAt = Date.now();
  const params = req.nextUrl.searchParams;

  const forcedScope = params.get("scope");
  const scope: SweepScope =
    forcedScope === "gcc" || forcedScope === "ksa"
      ? forcedScope
      : new Date().getUTCDay() === GCC_WEEKDAY ? "gcc" : "ksa";

  const cities = params.get("city")?.split(",").map((s) => s.trim()).filter(Boolean);
  const num = (key: string) => {
    const v = params.get(key);
    if (v === null) return undefined;
    const n = Number.parseInt(v, 10);
    return Number.isNaN(n) ? undefined : n;
  };
  const eventsPerCity = num("events");
  const venuesPerCity = num("venues");
  const vendorCount = num("vendors");

  const run = await startAgentRun("content-agent", {
    version: 2, trigger: cronSecret && req.headers.get("authorization") ? "cron" : "manual",
    scope, cities: cities ?? null,
  });

  try {
    const result = await runContentAgent({
      scope,
      cities,
      eventsPerCity,
      venuesPerCity: venuesPerCity === 0 ? undefined : venuesPerCity,
      skipVenues: venuesPerCity === 0,
      vendorCount: vendorCount === 0 ? undefined : vendorCount,
      skipVendors: vendorCount === 0,
      // Leave ~60s of the 300s function budget for in-flight jobs + logging.
      deadlineMs: startedAt + 220_000,
    });

    const summary = summarizeRun(result);
    const itemsCreated = result.totals.eventsPublished + result.totals.venuesPublished + result.totals.vendorsCreated;
    const itemsSkipped =
      result.events.reduce((n, s) => n + s.duplicates + s.invalid + s.rejected, 0) +
      result.venues.reduce((n, s) => n + s.duplicates + s.invalid, 0) +
      (result.vendors ? result.vendors.skipped + result.vendors.invalid : 0);

    await finishAgentRun(run.id, {
      status: "success",
      itemsCreated,
      itemsSkipped,
      summary,
      errorMessage: result.errors.length > 0 ? result.errors.join(" | ") : undefined,
    });

    return NextResponse.json({ ok: true, durationMs: Date.now() - startedAt, summary, result });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error("[content-agent] run failed:", err);
    await finishAgentRun(run.id, { status: "error", errorMessage });
    return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
  }
}
