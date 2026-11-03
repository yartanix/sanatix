// Client-side (browser) Sentry init. Loaded automatically by Next.js —
// https://docs.sentry.io/platforms/javascript/guides/nextjs/
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // No-op without a DSN — keeps local dev and any fork that hasn't set up
  // its own Sentry project from erroring or sending events anywhere.
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,

  tracesSampleRate: 0.1,

  // Session Replay: only record a session that actually hit an error, never
  // an arbitrary sample of ordinary browsing. Mask everything — booking
  // totals, guest lists and contact details all pass through pages this
  // could otherwise capture.
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 1.0,
  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || process.env.NODE_ENV,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
