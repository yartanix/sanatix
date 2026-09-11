import Anthropic from "@anthropic-ai/sdk";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

function getClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set.");
  return new Anthropic({ apiKey });
}

export interface ResearchResult {
  items: unknown[];
  searchesUsed: number;
  stopReason: string | null;
}

/**
 * Runs one web-search-grounded research prompt and extracts the JSON
 * array the prompt asks for. Returns the raw parsed array — schema
 * validation is the caller's job, per item, so one bad object never
 * discards the rest.
 *
 * Throws only on a hard API failure or completely unparseable output.
 */
export async function researchAndExtractJson(prompt: string, maxSearches: number): Promise<ResearchResult> {
  const client = getClient();

  const response = await client.messages.create({
    model: MODEL,
    // Headroom for `maxSearches` searches + a one-line summary + up to ~10
    // JSON objects. 4096 was observed to truncate before the JSON block.
    max_tokens: 8192,
    tools: [{ type: "web_search_20250305", name: "web_search", max_uses: maxSearches }],
    messages: [{ role: "user", content: prompt }],
  });

  const searchesUsed = response.content.filter((b) => b.type === "server_tool_use").length;

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n");

  const fenced = text.match(/```json\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text.slice(text.indexOf("["), text.lastIndexOf("]") + 1);

  if (!candidate || candidate.trim().length === 0) {
    const truncationNote =
      response.stop_reason === "max_tokens"
        ? " (response was cut off at max_tokens before reaching the JSON block)"
        : "";
    throw new Error(
      `No JSON array found in model output${truncationNote}. stop_reason=${response.stop_reason}. Raw text: ${text.slice(0, 400)}`
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(candidate);
  } catch (e) {
    throw new Error(`Model output was not valid JSON: ${(e as Error).message}. Head: ${candidate.slice(0, 200)}`);
  }
  if (!Array.isArray(parsed)) throw new Error("Parsed JSON was not an array.");

  return { items: parsed, searchesUsed, stopReason: response.stop_reason };
}

/**
 * Runs async jobs with a concurrency cap and a wall-clock budget. Jobs
 * that haven't *started* by the deadline are skipped (reported back so
 * the caller can log them and pick them up next run). Jobs already
 * running are allowed to finish.
 */
export async function runWithBudget<T>(
  jobs: { key: string; run: () => Promise<T> }[],
  opts: { concurrency: number; deadlineMs: number }
): Promise<{ results: Map<string, PromiseSettledResult<T>>; skipped: string[] }> {
  const results = new Map<string, PromiseSettledResult<T>>();
  const skipped: string[] = [];
  const queue = [...jobs];

  async function worker() {
    while (queue.length > 0) {
      if (Date.now() > opts.deadlineMs) {
        const rest = queue.splice(0, queue.length);
        skipped.push(...rest.map((j) => j.key));
        return;
      }
      const job = queue.shift()!;
      try {
        results.set(job.key, { status: "fulfilled", value: await job.run() });
      } catch (reason) {
        results.set(job.key, { status: "rejected", reason });
      }
    }
  }

  await Promise.all(Array.from({ length: Math.max(1, opts.concurrency) }, () => worker()));
  return { results, skipped };
}
