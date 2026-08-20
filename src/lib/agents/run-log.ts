import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Every background agent writes one row to `agent_runs` per invocation,
 * from "started" through "finished" — this is the only place agent
 * behavior is observable. Without it, a cron job that's silently failing
 * (bad API key, exhausted search quota, a schema mismatch) looks
 * identical to one that's succeeding and just finding nothing to do.
 *
 * Usage:
 *   const run = await startAgentRun("content-agent", { note: "daily events+vendors sweep" });
 *   try {
 *     // ... do work, track counts ...
 *     await finishAgentRun(run.id, { status: "success", itemsCreated, itemsSkipped, summary });
 *   } catch (err) {
 *     await finishAgentRun(run.id, { status: "error", errorMessage: String(err) });
 *     throw err;
 *   }
 */

export async function startAgentRun(agentName: string, metadata?: Record<string, unknown>) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("agent_runs")
    .insert({ agent_name: agentName, status: "running", metadata: metadata ?? null })
    .select("id")
    .single();

  if (error || !data) {
    // Logging failure shouldn't take down the agent itself — fall back to
    // a console line so there's at least something in Vercel's function logs.
    console.error(`[agent-run-log] failed to start run for ${agentName}:`, error);
    return { id: null as string | null };
  }
  return { id: data.id as string };
}

export async function finishAgentRun(
  runId: string | null,
  result: {
    status: "success" | "error";
    itemsCreated?: number;
    itemsSkipped?: number;
    summary?: string;
    errorMessage?: string;
  }
) {
  if (!runId) {
    console.error("[agent-run-log] finishAgentRun called with no runId — result was:", result);
    return;
  }
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("agent_runs")
    .update({
      status: result.status,
      finished_at: new Date().toISOString(),
      items_created: result.itemsCreated ?? 0,
      items_skipped: result.itemsSkipped ?? 0,
      summary: result.summary ?? null,
      error_message: result.errorMessage ?? null,
    })
    .eq("id", runId);

  if (error) {
    console.error(`[agent-run-log] failed to finish run ${runId}:`, error);
  }
}
