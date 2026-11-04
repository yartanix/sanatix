// Sends push notifications through Expo's push service — no SDK needed,
// it's a plain HTTPS endpoint. https://docs.expo.dev/push-notifications/sending-notifications/
//
// Used server-side only (API routes), never from the browser — this is
// where the mobile app's registered Expo push tokens (migration 012)
// actually get used.

interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

const EXPO_PUSH_ENDPOINT = "https://exp.host/--/api/v2/push/send";

/**
 * Sends a push notification to one or more Expo push tokens. Failures are
 * swallowed (logged, not thrown) — a push notification failing to send
 * should never break the request that triggered it (e.g. a guest's RSVP
 * submission must still succeed even if notifying the host fails).
 */
export async function sendExpoPushNotifications(
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<void> {
  const validTokens = tokens.filter((t) => t.startsWith("ExponentPushToken["));
  if (validTokens.length === 0) return;

  const messages: ExpoPushMessage[] = validTokens.map((to) => ({ to, title, body, data }));

  try {
    const res = await fetch(EXPO_PUSH_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(messages),
    });

    if (!res.ok) {
      console.error("Expo push send failed:", res.status, await res.text().catch(() => ""));
    }
  } catch (error) {
    console.error("Expo push send threw:", error);
  }
}
