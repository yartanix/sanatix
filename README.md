# Sanatix — سناتيكس

> **Light up your moments · أضئ لحظاتك**

GCC event marketplace — connecting attendees, organizers, and vendors.

---

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Database**: Supabase (PostgreSQL + Auth + Storage)
- **Hosting**: Vercel
- **i18n**: next-intl (Arabic default, English)
- **Styling**: Tailwind CSS
- **Payments**: HyperPay, Stripe, Tabby/Tamara, STC Pay

## Getting Started

```bash
npm install
cp .env.local.example .env.local
# Fill in your environment variables
npm run dev
```

## Project Structure

```
src/
├── app/
│   ├── [locale]/           # Localized pages (ar/en)
│   │   ├── (auth)/         # Login, Register
│   │   └── (main)/         # Events, Vendors, Dashboard
│   └── api/                # API routes
├── components/             # Reusable components
├── i18n/                   # Routing + request config
├── lib/
│   ├── supabase/           # Client + Server clients
│   └── utils/              # Helpers
├── styles/                 # Global CSS
└── types/                  # TypeScript types
messages/
├── ar.json                 # Arabic strings
└── en.json                 # English strings
supabase/
└── schema.sql              # Full DB schema
```

## Environment Variables

See `.env.local.example` for all required variables.

## Domain

Production: [sanatix.net](https://sanatix.net)
