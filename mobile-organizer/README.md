# Sanatix Organizer (mobile) — RETIRED, merged into `mobile/`

**This app is no longer maintained.** Its screens (Events, Attendees/check-in,
Crowdfunding, Settings) have been merged into the consumer `mobile/` app,
which is now the single unified mobile app for both participants and
organizers — see `mobile/README.md`. `mobile-supplier/` remains a separate
app.

This directory is left in place for reference only. It was never
registered with EAS/Apple/Google and was never distributed to a store or
to any real device outside development testing, so nothing is lost by not
shipping it — don't `eas build`/`eas submit` from here. New organizer work
goes into `mobile/app/(tabs)/events.tsx`, `mobile/app/(tabs)/campaigns.tsx`,
and the `mobile/app/events/**` / `mobile/app/campaigns/**` screens instead.

This folder can be deleted outright once someone with `git` push access to
this repo removes it (`git rm -r mobile-organizer`) — it wasn't removed as
part of the merge itself because the tooling that performed the merge only
had GitHub's web upload flow available, not `git push`, and deleting a
whole directory isn't possible through that flow.

<details>
<summary>Original README (kept for history)</summary>

Standalone Expo app for event organizers — a separate app and App Store /
Play Store listing from the consumer `mobile/` app and from
`mobile-supplier/`. Scaffolded as a sibling copy of `mobile/`'s shared
infra (Supabase client, secure session storage, push, Sentry wrapper,
styles) with its own screens.

Bundle id: `net.sanatix.organizer` (iOS and Android). Shares the same
Supabase project/auth as the web app and the other mobile apps — an
organizer's web account logs in here directly.

### Scope (first build)

- Events: create/edit, status (draft/published/cancelled/completed), ticket types
- Attendees: list per event + manual check-in (ticket code, no camera —
  mirrors the web Permissions-Policy decision; see `supabase/migrations/017_booking_checkin.sql`)
- Crowdfunding: create/manage campaigns (new backend — see `supabase/migrations/...` comments, this didn't exist on web before this change either, added alongside)
- Settings: name/phone

Not included yet (flagged, not silently skipped): a camera-based QR
scanner (would need `expo-camera` + a real device to verify — this
sandbox cannot boot one), and anything payment-related (no gateway is
wired in anywhere in the product yet).

### Setup

```
npm install
cp .env.example .env   # fill in EXPO_PUBLIC_SUPABASE_URL / ANON_KEY
npx expo start
```

### Before the first EAS build

This app has never been registered with EAS/Apple/Google yet:

1. `eas init` (creates the EAS project, writes `extra.eas.projectId` into
   `app.json` — omitted here since it doesn't exist yet)
2. Create the App Store Connect app record (bundle id `net.sanatix.organizer`)
3. Create the Google Play Console app (package `net.sanatix.organizer`),
   plus its own `google-service-account.json` for `eas submit`
4. Re-add the Sentry plugin once a `sanatix-organizer-mobile` Sentry
   project exists (left out of `app.json` for now so a missing project
   doesn't fail the build)

</details>
