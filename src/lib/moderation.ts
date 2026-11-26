import Anthropic from "@anthropic-ai/sdk";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

/**
 * Moderates a user-submitted review comment before it's ever written to
 * the database (Fahoood, Nov 26 2026: "AI agent make sure no offense in
 * the text and its lawful to be published").
 *
 * Fails CLOSED: if the Anthropic call itself errors (bad key, rate limit,
 * network), the comment is rejected with a "try again" message rather
 * than published unchecked. The alternative — publishing on moderation
 * failure — defeats the point of asking for moderation at all. Known
 * risk: content-agent has already gone 15+ days failing silently on an
 * Anthropic billing issue (see /areas/sanatix.md) — if that happens
 * again, review comments stop saving entirely rather than bypassing the
 * check. That's the correct tradeoff here, but surfaced in the APPLY doc
 * so Fahoood knows to watch for it.
 */
export interface ModerationResult {
  allowed: boolean;
  reason?: string; // shown to the user when allowed is false
}

export async function moderateComment(text: string): Promise<ModerationResult> {
  const trimmed = text.trim();
  if (trimmed.length === 0) return { allowed: true };

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("[moderation] ANTHROPIC_API_KEY not set — rejecting comment (fail closed).");
    return { allowed: false, reason: "Comments can't be checked right now. Please try again shortly." };
  }

  try {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 200,
      messages: [
        {
          role: "user",
          content: `You are a content moderator for a public vendor-review comment on a GCC family-events marketplace (Sanatix). The comment will be shown publicly next to a star rating, attributed to the organizer who wrote it.

Reject (allowed: false) if the comment contains ANY of:
- Profanity, slurs, insults, harassment, or hate speech (in English or Arabic)
- Threats or incitement to violence
- Defamatory claims presented as fact that could expose Sanatix to legal liability (e.g. accusing the vendor of a crime, fraud, or named wrongdoing without the comment being a clearly-labeled personal opinion/experience)
- Someone else's personal data: phone numbers, email addresses, national ID / Iqama numbers, home addresses, payment details
- Spam, advertising for a competing business, or unrelated promotional links
- Content that is otherwise unlawful to publish in Saudi Arabia / the GCC

A genuine, even strongly negative, first-person account of bad service ("they arrived 2 hours late and never apologized") is ALLOWED — this is a real review comment, not a getting-to-yes exercise. Only reject for the specific categories above.

Comment to review (may be in English or Arabic):
"""
${trimmed}
"""

Respond with ONLY a JSON object, no other text: {"allowed": true} or {"allowed": false, "reason": "<one short sentence, same language as the comment, telling the author what to remove or rephrase>"}`,
        },
      ],
    });

    const text_ = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");

    const match = text_.match(/\{[\s\S]*\}/);
    if (!match) {
      console.error("[moderation] no JSON object in model output:", text_.slice(0, 300));
      return { allowed: false, reason: "Comments can't be checked right now. Please try again shortly." };
    }

    const parsed = JSON.parse(match[0]) as { allowed?: boolean; reason?: string };
    if (typeof parsed.allowed !== "boolean") {
      return { allowed: false, reason: "Comments can't be checked right now. Please try again shortly." };
    }
    return parsed.allowed ? { allowed: true } : { allowed: false, reason: parsed.reason ?? "This comment can't be published as written." };
  } catch (err) {
    console.error("[moderation] Anthropic call failed:", err);
    return { allowed: false, reason: "Comments can't be checked right now. Please try again shortly." };
  }
}
