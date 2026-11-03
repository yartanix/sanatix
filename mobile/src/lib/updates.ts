import { useEffect } from "react";
import * as Updates from "expo-updates";
import { Sentry } from "@/lib/sentry";

/**
 * Checks for an over-the-air update once, right after the app starts, and
 * applies it immediately if one is found — instead of silently waiting for
 * the *next* cold start (expo-updates' own default behavior). A host
 * fixing a typo in a party date or a broken button doesn't want to wait on
 * users to happen to relaunch twice.
 *
 * No-ops entirely in Expo Go and in local dev builds, where expo-updates
 * isn't active — `Updates.isEnabled` is false there.
 */
export function useOTAUpdates() {
  useEffect(() => {
    if (!Updates.isEnabled) return;

    let cancelled = false;

    (async () => {
      try {
        const result = await Updates.checkForUpdateAsync();
        if (!result.isAvailable || cancelled) return;

        await Updates.fetchUpdateAsync();
        if (cancelled) return;

        // Reload immediately. The app is only ever a few seconds into a
        // fresh launch at this point (this runs once, on mount, from the
        // root layout), so there's nothing mid-flow to interrupt.
        await Updates.reloadAsync();
      } catch (error) {
        // A flaky network on launch is normal and shouldn't be reported as
        // a crash — just let the app carry on running its current bundle.
        // Still worth a breadcrumb in Sentry if something less expected
        // goes wrong (e.g. a corrupt manifest).
        Sentry.captureException(error, { tags: { context: "ota-update-check" } });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);
}
