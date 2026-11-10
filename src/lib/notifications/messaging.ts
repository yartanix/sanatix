// Direct-to-guest invite/reminder delivery over WhatsApp and SMS — the
// feature Hayhom's whole product is built around (the host never has to
// manually forward a link; the guest gets a message on their phone with
// no app and no account needed).
//
// Both senders are real, working integrations, but they fail closed (log
// and return a typed failure) when the provider isn't configured yet,
// exactly like the Sentry auth token / Moyasar pattern elsewhere in this
// codebase: wiring in code is safe to ship today, flipping it on is a
// separate step that needs real account credentials from Fahoood.
//
// WhatsApp uses Meta's official WhatsApp Business Cloud API — this is
// NOT the "send through the consumer WhatsApp app" integration that was
// ruled out earlier (no public API exists for that). The Cloud API is a
// real, documented, business-verified channel: it requires a Meta
// Business Manager account, a registered WhatsApp Business phone number,
// and at least one pre-approved message template (an invite + a
// reminder, both free-form text with variables, go through Meta's
// template-approval process once). None of that can happen from this
// sandbox — it's a business step for Fahoood.
//
// SMS uses a generic REST-ish provider interface so whichever gateway
// actually has good KSA/GCC deliverability (Taqnyat and Unifonic are the
// two mainstream Saudi options; Twilio works but has weaker local
// deliverability) can be dropped in by implementing `sendViaProvider`
// without touching call sites.

export type MessageChannel = "whatsapp" | "sms";

export interface SendResult {
  ok: boolean;
  skipped?: boolean; // true when the provider isn't configured — not an error
  error?: string;
}

function isConfigured(channel: MessageChannel): boolean {
  if (channel === "whatsapp") {
    return !!(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
  }
  return !!(process.env.SMS_PROVIDER_API_KEY && process.env.SMS_SENDER_ID);
}

/**
 * Sends a WhatsApp message via the Cloud API using a pre-approved
 * template. `templateName` must already exist and be approved in the
 * Meta Business account (WHATSAPP_PHONE_NUMBER_ID's account) — an
 * unapproved or misspelled template name fails the call, it does not
 * silently fall back to free text (the Cloud API doesn't allow
 * free-form outbound messages outside a 24h customer-service window).
 */
export async function sendWhatsAppTemplate(
  toE164Phone: string,
  templateName: string,
  bodyParams: string[]
): Promise<SendResult> {
  if (!isConfigured("whatsapp")) {
    console.warn("[messaging] WhatsApp not configured — skipping send to", toE164Phone);
    return { ok: false, skipped: true };
  }

  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: toE164Phone.replace(/[^\d+]/g, ""),
        type: "template",
        template: {
          name: templateName,
          language: { code: "en" },
          components: [
            {
              type: "body",
              parameters: bodyParams.map((text) => ({ type: "text", text })),
            },
          ],
        },
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("[messaging] WhatsApp send failed:", res.status, body);
      return { ok: false, error: `whatsapp_http_${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    console.error("[messaging] WhatsApp send threw:", err);
    return { ok: false, error: "whatsapp_exception" };
  }
}

/**
 * Sends a plain-text SMS. Swap the body of `sendViaProvider` for whatever
 * gateway Fahoood signs up with (Taqnyat and Unifonic both expose a
 * simple REST send endpoint with an API key + sender ID, matching the
 * shape already assumed here) — nothing else in the codebase needs to
 * change.
 */
export async function sendSms(toE164Phone: string, message: string): Promise<SendResult> {
  if (!isConfigured("sms")) {
    console.warn("[messaging] SMS not configured — skipping send to", toE164Phone);
    return { ok: false, skipped: true };
  }
  return sendViaProvider(toE164Phone, message);
}

async function sendViaProvider(toE164Phone: string, message: string): Promise<SendResult> {
  const apiKey = process.env.SMS_PROVIDER_API_KEY;
  const senderId = process.env.SMS_SENDER_ID;
  const endpoint = process.env.SMS_PROVIDER_ENDPOINT || "https://api.taqnyat.sa/v1/messages";

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        recipients: [toE164Phone.replace(/[^\d+]/g, "")],
        body: message,
        sender: senderId,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("[messaging] SMS send failed:", res.status, body);
      return { ok: false, error: `sms_http_${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    console.error("[messaging] SMS send threw:", err);
    return { ok: false, error: "sms_exception" };
  }
}

/**
 * Shared entry point used by both the invite-creation flow and the
 * reminder cron: picks the channel, builds the message, and never
 * throws — a messaging failure must never break guest creation or the
 * reminder sweep for everyone else.
 */
export async function sendPartyInvite(opts: {
  channel: MessageChannel;
  phone: string;
  guestName: string;
  partyTitle: string;
  whenText: string;
  rsvpUrl: string;
  kind: "invite" | "reminder";
}): Promise<SendResult> {
  const { channel, phone, guestName, partyTitle, whenText, rsvpUrl, kind } = opts;

  if (channel === "whatsapp") {
    const templateName =
      kind === "invite"
        ? process.env.WHATSAPP_TEMPLATE_INVITE || "sanatix_party_invite"
        : process.env.WHATSAPP_TEMPLATE_REMINDER || "sanatix_party_reminder";
    return sendWhatsAppTemplate(phone, templateName, [guestName, partyTitle, whenText, rsvpUrl]);
  }

  const message =
    kind === "invite"
      ? `Hi ${guestName}, you're invited to ${partyTitle} (${whenText}). RSVP: ${rsvpUrl}`
      : `Reminder: ${partyTitle} is coming up (${whenText}). RSVP/details: ${rsvpUrl}`;
  return sendSms(phone, message);
}
