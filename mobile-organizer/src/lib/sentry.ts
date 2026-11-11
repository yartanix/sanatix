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
    // @sentry/react-native auto-adds its "ExpoRouter" integration whenever
    // tracing is enabled (tracesSampleRate is set above). That integration
    // polls for expo-router's *internal* navigation-event emitter via
    // require("expo-router/build/global-state/internalNavigationEvents") —
    // a module that only exists on the Expo Router version that ships with
    // newer Expo SDKs ("Expo Router 58+" per @sentry/react-native's own
    // source comment). This project is still on expo-router@4.0.22 (Expo
    // SDK 52), where that file does not exist at all. Because expo-router's
    // package.json on this version has no "exports" map, Metro doesn't fail
    // the build over the unresolved deep import — it silently compiles the
    // require() call site down to a dependency-map slot that is `undefined`,
    // so calling it at runtime throws `Requiring unknown module "undefined"`.
    // That throw happens inside a try/catch (tryGetExpoRouterNavigationEvents
    // in @sentry/react-native), but the Metro `inlineRequires` optimization
    // this project's metro.config.js enables hoists require() calls out of
    // their enclosing function — including out from under that catch block
    // — so the error escapes uncaught and crashes the app on every launch,
    // every time this integration's poll loop runs (expo-updates' own
    // error-recovery retry hits the identical crash, so there's no
    // recoverable error screen either).
    //
    // Dropping just this one default integration keeps every other default
    // (app start tracing, stall tracking, user interaction tracing, error
    // capture, breadcrumbs, etc.) intact; it only gives up automatic
    // route-name tagging on performance spans, which nothing here relies on.
    integrations: (defaultIntegrations) =>
      defaultIntegrations.filter((integration) => integration.name !== "ExpoRouter"),
  });
}

export { Sentry };
