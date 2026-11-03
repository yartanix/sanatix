import * as Sentry from "@sentry/react-native";

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

// No-op without a DSN — keeps Expo Go, local dev, and any fork that hasn't
// set up its own Sentry project from erroring or sending events anywhere.
if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.2,
    environment: process.env.EXPO_PUBLIC_SENTRY_ENVIRONMENT || (__DEV__ ? "development" : "production"),
    // EAS attaches the build's channel/update info automatically; this just
    // makes sure dev-client sessions are never mistaken for the real thing.
    enabled: true,
  });
}

export { Sentry };
