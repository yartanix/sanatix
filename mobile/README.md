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
