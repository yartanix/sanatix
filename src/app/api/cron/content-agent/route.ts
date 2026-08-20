import { NextRequest, NextResponse } from "next/server";
import { runContentAgent } from "@/lib/agents/content-agent";
import { startAgentRun, finishAgentRun } from "@/lib/agents/run-log";

export const maxDuration = 300; // seconds — web search + two Claude calls can take a while

/**
 * Triggered by Vercel Cron (see vercel.json) on a daily schedule, and
 * callable manually (e.g. from the Vercel dashboard, or curl) for testing.
 *
 * Auth: Vercel automatically sends `Authorization: Bearer $CRON_SECRET`
 * on cron-triggered requests once CRON_SECRET is set as an environment
 * variable — this checks that header so the route can't be triggered by
 * anyone who finds the URL. Manual/local testing needs the same header
 * set explicitly (see CHANGES.md).
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

  const run = await startAgentRun("content-agent", { trigger: "cron" });

  try {
    const result = await runContentAgent();

    const summary =
      `Created ${result.eventsCreated} draft event(s), ${result.eventsSkipped} skipped (duplicate/insert error), ` +
      `${result.eventsFoundInvalid} failed schema validation. ` +
      `Created ${result.vendorsCreated} vendor(s), ${result.vendorsSkipped} skipped, ` +
      `${result.vendorsFoundInvalid} failed schema validation.`;

    await finishAgentRun(run.id, {
      status: "success",
      itemsCreated: result.eventsCreated + result.vendorsCreated,
      itemsSkipped: result.eventsSkipped + result.vendorsSkipped,
      summary,
    });

    return NextResponse.json({ ok: true, summary, result });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error("[content-agent] run failed:", err);
    await finishAgentRun(run.id, { status: "error", errorMessage });
    return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
  }
}
