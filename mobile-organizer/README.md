# Sanatix Organizer (mobile)

Standalone Expo app for event organizers — a separate app and App Store /
Play Store listing from the consumer `mobile/` app and from
`mobile-supplier/`. Scaffolded as a sibling copy of `mobile/`'s shared
infra (Supabase client, secure session storage, push, Sentry wrapper,
styles) with its own screens.

Bundle id: `net.sanatix.organizer` (iOS and Android). Shares the same
Supabase project/auth as the web app and the other mobile apps — an
organizer's web account logs in here directly.

## Scope (first build)

- Events: create/edit, status (draft/published/cancelled/completed), ticket types
- Attendees: list per event + manual check-in (ticket code, no camera —
  mirrors the web Permissions-Policy decision; see `supabase/migrations/017_booking_checkin.sql`)
- Crowdfunding: create/manage campaigns (new backend — see `supabase/migrations/...` comments, this didn't exist on web before this change either, added alongside)
- Settings: name/phone

Not included yet (flagged, not silently skipped): a camera-based QR
scanner (would need `expo-camera` + a real device to verify — this
sandbox cannot boot one), and anything payment-related (no gateway is
wired in anywhere in the product yet).

## Setup

```
npm install
cp .env.example .env   # fill in EXPO_PUBLIC_SUPABASE_URL / ANON_KEY
npx expo start
```

## Before the first EAS build

This app has never been registered with EAS/Apple/Google yet:

1. `eas init` (creates the EAS project, writes `extra.eas.projectId` into
   `app.json` — omitted here since it doesn't exist yet)
2. Create the App Store Connect app record (bundle id `net.sanatix.organizer`)
3. Create the Google Play Console app (package `net.sanatix.organizer`),
   plus its own `google-service-account.json` for `eas submit`
4. Re-add the Sentry plugin once a `sanatix-organizer-mobile` Sentry
   project exists (left out of `app.json` for now so a missing project
   doesn't fail the build)
