# Sanatix Supplier (mobile)

Standalone Expo app for Sanatix vendors — a separate app and App Store /
Play Store listing from the consumer `mobile/` app and from
`mobile-organizer/`. Scaffolded as a sibling copy of `mobile/`'s shared
infra (Supabase client, secure session storage, push, Sentry wrapper,
styles) with its own screens.

Bundle id: `net.sanatix.supplier` (iOS and Android). Shares the same
Supabase project/auth as the web app — a vendor's web account logs in
here directly.

## Scope (first build)

Web had **no vendor self-service system at all** before this change —
only public browsing and admin moderation. This app's backend
(`supabase/migrations/016_vendor_dashboard.sql`, plus the `/api/vendor/*`
and `/api/vendors/[id]/inquiries` routes, plus the `(vendor)` web
dashboard) was built alongside it, not ported from an existing feature —
flagged to the founder, who asked for both together.

- Vendor profile: edit name/description/city/WhatsApp (verification
  status is read-only, same as web)
- Inquiries: inbox for the public "ask this vendor" form, respond to each
- Reviews: see reviews left on the vendor, respond to each (public reply,
  visible on the vendor's web page)

## Setup

```
npm install
cp .env.example .env   # fill in EXPO_PUBLIC_SUPABASE_URL / ANON_KEY
npx expo start
```

## Before the first EAS build

Same as `mobile-organizer/README.md` — this app has never been
registered with EAS/Apple/Google. `eas init`, a new App Store Connect
record, a new Play Console app + its own `google-service-account.json`,
and a Sentry project before re-adding that plugin.
