import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { withSentryConfig } from "@sentry/nextjs/config";

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
};

export default withSentryConfig(withNextIntl(nextConfig), {
  // sanatix.net's Sentry org/project slugs — only used to upload source
  // maps at build time (makes stack traces readable instead of minified
  // gibberish). Harmless if these don't exist yet or auth isn't set: the
  // Sentry build plugin just skips the upload and logs a warning.
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Only print Sentry's build-time logging in CI, not on every local dev
  // build.
  silent: !process.env.CI,

  // Upload a larger slice of client source maps so stack traces resolve
  // through vendor chunks too, not just app code.
  widenClientFileUpload: true,

  webpack: {
    // Drops Sentry's own debug-logger statements from the bundle — they're
    // only useful while debugging the SDK itself, not in production.
    treeshake: {
      removeDebugLogging: true,
    },
  },
});
