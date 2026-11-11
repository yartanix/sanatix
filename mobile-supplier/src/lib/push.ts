import { Platform } from "react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { supabase } from "@/lib/supabase";
import { Sentry } from "@/lib/sentry";

// Show an in-app banner/sound for a notification that arrives while the
// app is open and in the foreground — otherwise Expo's default is to
// silently queue it until the user backgrounds the app, which feels like
// nothing happened on the one screen where you'd actually see the toast.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Registers this device for push notifications and upserts the resulting
 * Expo push token into the `push_tokens` table (migration 012), tied to
 * the currently-logged-in user. Safe to call on every app launch/login —
 * re-registering the same token is just a no-op upsert.
 *
 * No-ops on a simulator/emulator (no push capability there) and when
 * permission is denied — it never nags the user with a system prompt more
 * than once per install, since iOS/Android remember a "don't ask again".
 */
export async function registerForPushNotifications(userId: string): Promise<void> {
  try {
    if (!Device.isDevice) {
      // Simulators/emulators can't receive real push notifications.
      return;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      return;
    }

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const { data: expoPushToken } = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );

    await supabase.from("push_tokens").upsert(
      {
        user_id: userId,
        expo_push_token: expoPushToken,
        platform: Platform.OS === "ios" ? "ios" : "android",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "expo_push_token" }
    );
  } catch (error) {
    // Push registration failing shouldn't block anything else the app
    // does — just note it and move on.
    Sentry.captureException(error, { tags: { context: "push-registration" } });
  }
}
