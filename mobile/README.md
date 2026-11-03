# Sanatix Mobile (Expo / React Native)

Cross-platform (iOS + Android) companion app for hosting a party and managing
guests/RSVPs. It shares the same Supabase project — and therefore the same
accounts and the same `parties` / `party_guests` tables (migration `011`) — as
sanatix.net, so a host can start on the web and finish on the phone, or
vice versa.

Guests never need this app, or even a Sanatix account: each guest's RSVP
link (`https://sanatix.net/rsvp/<token>`) opens a public web page that works
on any phone.

## What it does

- Log in with an existing Sanatix account (sign-up isn't built into the app
  yet — create an account on sanatix.net first).
- See your parties and each one's confirmed-guest count.
- Create a party (title, date/time, location, notes).
- Add guests manually, or pick them straight from your phone's contacts.
- Share a guest's personal RSVP link through the OS share sheet — this is
  how WhatsApp, Instagram, Snapchat and TikTok are "integrated." None of
  those four platforms expose a public API for sending a DM to an arbitrary
  person, so this hand-off through the native share sheet (the same one the
  web app uses via `navigator.share`) is the full extent of what's possible
  without becoming a WhatsApp Business API customer (separate Meta
  verification + per-message cost beyond a free tier) — which was explicitly
  out of scope per your own choice of "share-sheet links."

## Local setup

```bash
cd mobile
npm install
cp .env.example .env
```

Fill in `.env`:

```
EXPO_PUBLIC_SUPABASE_URL=https://fobrdnjicooekbrknojo.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<the same anon key the web app uses — Vercel project settings or Supabase dashboard → Project Settings → API>
EXPO_PUBLIC_SITE_URL=https://sanatix.net
```

Then run it with Expo Go for day-to-day development (no Apple/Google
account needed for this part):

```bash
npx expo start
```

Scan the QR code with the Expo Go app (iOS or Android) or press `i` / `a`
to launch an iOS Simulator / Android emulator if you have one installed.

Contacts picking requires a real device or a simulator with contacts
seeded — it won't show anything useful on a bare emulator with an empty
address book.

## What this app needs from the database

Nothing extra beyond migration `011_party_invitations_rsvp.sql`, which you
already applied for the web feature. The app talks to Supabase directly
(same RLS policies — `host_id = auth.uid()` — as the web app), so there is
no separate backend to deploy for the app itself.

## Getting it onto an actual phone (App Store / Play Store)

This is the one part that's genuinely outside what I can do from here —
it requires accounts only you can create and pay for:

1. **Apple Developer Program** — $99/year, developer.apple.com. Needed to
   install on a physical iPhone outside Expo Go, and required for App Store
   submission.
2. **Google Play Console** — $25 one-time, play.google.com/console. Needed
   for Play Store submission (Android side-loading/testing is free and
   doesn't need this).
3. **Expo Application Services (EAS)** — free tier is enough to start,
   eas.dev. This is what actually compiles the JS/TS in this folder into a
   real `.ipa` (iOS) / `.aab` or `.apk` (Android):

   ```bash
   npm install -g eas-cli
   eas login
   eas build:configure
   eas build --platform ios
   eas build --platform android
   ```

   The first `eas build:configure` will ask a few questions (bundle
   identifier is already set to `net.sanatix.app` in `app.json`) and wire
   up credentials. iOS builds need your Apple Developer account connected;
   EAS can manage the signing certificates for you.

4. **Submit**:
   ```bash
   eas submit --platform ios
   eas submit --platform android
   ```
   Each store also wants store-listing assets (screenshots, an icon —
   `app.json` references a placeholder icon path that should be swapped for
   a real one before submission, privacy policy URL, app description) that
   are a content/business decision, not a coding one.

Until step 3 is run, the app only runs inside Expo Go — which is genuinely
fine for using it yourself or testing with a few people (just share the
`npx expo start` QR code), just not for public distribution.

## Over-the-air updates (EAS Update)

Every real build (preview or production, from CI or run by hand) now
checks for an update the moment it launches, and applies it immediately if
one is found — see `src/lib/updates.ts`. This means a JS/asset-only fix
(a copy change, a bug in a screen, a tweak to styling) can go out to every
installed copy of the app **without a new App Store / Play Store
submission and without the user doing anything** — it lands the next time
they open the app, same day you ship it, no review wait.

**This only works for JS and asset changes.** It cannot update anything
native — a new native module (like this patch's own `expo-updates`
install), a changed Info.plist/AndroidManifest permission, a bumped Expo
SDK. Shipping one of those always requires a real new build through the
normal `eas build` / store submission path above. Mixing the two up (OTA
to a build that doesn't have the native code the JS now expects) is the
single most common way teams break production with this feature — when in
doubt, do a normal build instead.

Each build profile in `eas.json` maps to its own **channel**
(`preview`, `production`, `development`) and an OTA update only reaches
builds on the channel it was published to — a `preview` update never
reaches someone running a `production` build, by design.

**To publish an update:** Actions tab → "Mobile CI/CD" → "Run workflow" →
tick **"publish OTA update instead"** → pick the `profile` matching which
channel should receive it (this reuses the same dropdown build normally
uses) → Run workflow. It typically finishes in under a minute and users on
that channel get the fix on their next app open.

You can also do it from your own machine, without touching GitHub Actions:
```bash
cd mobile
eas update --channel preview --message "fix: typo in party confirmation screen"
```

## CI/CD (GitHub Actions + EAS)

`.github/workflows/mobile-ci.yml` (repo root) automates the above once it's
wired up. What it does:

- **Any pull request touching `mobile/`** — runs `tsc --noEmit` and eslint.
  Nothing builds, nothing needs secrets. This alone is free to turn on today.
- **Every push to `main` touching `mobile/`** — builds a "preview" build via
  EAS: an installable app distributed through an EAS link/QR code, no App
  Store/Play account involved at all. This only needs an Expo account.
- **Manually, from the Actions tab** ("Run workflow" → pick a profile and
  platform → tick "submit" if ready) — builds a store-ready build and
  uploads it to TestFlight (internal) and/or the Play Console's internal
  testing track. Submitting is the one step that's never automatic by
  default — a bad commit can't silently reach App Store Review or Play
  without you choosing to send it there.

**Platform note:** the workflow's `platform` input defaults to **`android`
only**, not `all`. iOS builds need a real Apple Developer account connected
before EAS can generate a distribution certificate non-interactively — until
that's set up, an iOS build attempt in CI fails with "EAS CLI couldn't find
any credentials suitable for internal distribution." Once your Apple
Developer account is active, run `eas credentials` once locally (interactive
— it'll walk you through generating/uploading the certificate), then you can
pick `platform: all` or `platform: ios` on future manual runs, and flip the
workflow's default back to `all` if you want every push building both
platforms again.

### One-time setup to turn this on

1. **Create an Expo account** at [expo.dev](https://expo.dev) (free) if you
   don't have one, then from `mobile/`:
   ```bash
   npm install -g eas-cli
   eas login
   eas build:configure
   ```
   This writes an EAS project ID into `app.json` automatically — commit that
   change.

2. **Get an Expo access token** for CI: expo.dev → your account → Settings →
   [Access Tokens](https://expo.dev/accounts/\[your-account\]/settings/access-tokens)
   → create one. Add it to the GitHub repo as a secret named `EXPO_TOKEN`
   (repo → Settings → Secrets and variables → Actions → New repository
   secret).

   With just this secret, the "push to main → preview build" half of the
   pipeline already works — nothing below is needed until you're ready to
   submit to the stores.

3. **For store submission** (once your Apple/Google developer accounts are
   active), three more secrets:

   - **`ASC_API_KEY_P8_BASE64`** — an App Store Connect API key. In
     [App Store Connect](https://appstoreconnect.apple.com) → Users and
     Access → Integrations → App Store Connect API → generate a key with
     "App Manager" access, download the `.p8` file (Apple only lets you
     download it once), then: `base64 -i AuthKey_XXXX.p8 | pbcopy` (Mac) or
     `certutil -encode AuthKey_XXXX.p8 tmp.b64` (Windows) — paste the result
     as the secret value.
   - **`ASC_API_KEY_ISSUER_ID`** and **`ASC_API_KEY_ID`** — shown right next
     to the key you just created in App Store Connect.
   - **`GOOGLE_SERVICE_ACCOUNT_JSON_BASE64`** — in Play Console → Setup → API
     access, create a service account with "Release manager" permission,
     download its JSON key, then base64-encode it the same way as above.

   You'll also need to have created the app's listing once in both App Store
   Connect and Play Console by hand (bundle ID `net.sanatix.app` / package
   `net.sanatix.app`) — EAS submits *to* an existing app record, it doesn't
   create the store listing itself.

### Running it

- Push anything under `mobile/` to `main` → check the Actions tab for the
  "Mobile CI/CD" run → once it finishes, the build's EAS link is in the job
  log (or at [expo.dev](https://expo.dev) under your project's Builds tab).
- When you're ready to put a build in front of testers in TestFlight/Play:
  Actions tab → "Mobile CI/CD" → "Run workflow" → profile `production`,
  submit `true`.
- Promoting that build from internal testing to the actual public release is
  a decision you make in App Store Connect / Play Console directly — this
  pipeline deliberately stops at internal testing, not public release.
