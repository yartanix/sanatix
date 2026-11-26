import { NextRequest, NextResponse } from "next/server";
import { runAccountManagerAgent } from "@/lib/agents/account-manager-agent";
import { startAgentRun, finishAgentRun } from "@/lib/agents/run-log";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

/**
 * Ali, the account-manager agent — entry point.
 *
 * Triggered daily by Vercel Cron (see vercel.json). Same auth pattern as
 * /api/cron/content-agent: fails closed (500) if CRON_SECRET isn't set,
 * rather than silently running unauthenticated.
 *
 * If SENDGRID_API_KEY isn't configured yet, this returns 200 with
 * configured: false rather than erroring — that's an expected, visible
 * "not set up yet" state, not a failure, until SendGrid + the sanatix.net
 * sending domain are set up (see account-manager-agent.ts's header
 * comment for exactly what's still needed and why it can't be done from
 * here).
 */
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error("[account-manager-agent] CRON_SECRET is not set — refusing to run unauthenticated.");
    return NextResponse.json({ error: "Server misconfigured: CRON_SECRET is not set" }, { status: 500 });
  }
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const run = await startAgentRun("account-manager-agent");

  try {
    const result = await runAccountManagerAgent();

    if (!result.configured) {
      await finishAgentRun(run.id, {
        status: "success",
        summary: "SENDGRID_API_KEY not set — nothing sent. See account-manager-agent.ts for setup steps.",
      });
      return NextResponse.json({
        configured: false,
        message: "Ali isn't live yet: SENDGRID_API_KEY is not set, and a verified sanatix.net sending domain is needed on the SendGrid account.",
      });
    }

    await finishAgentRun(run.id, {
      status: "success",
      itemsCreated: result.sent,
      itemsSkipped: result.failed,
      summary: `${result.sent} invitations sent, ${result.failed} failed, out of ${result.candidates} eligible vendors.`,
    });

    return NextResponse.json(result);
  } catch (err) {
    await finishAgentRun(run.id, { status: "error", errorMessage: String(err) });
    console.error("[account-manager-agent] run failed:", err);
    return NextResponse.json({ error: "Run failed" }, { status: 500 });
  }
}
