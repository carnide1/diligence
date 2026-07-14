# Diligence

Personal habit and daily-goal tracker. V1 scope is locked in [`DILIGENCE_V1_BLUEPRINT.md`](./DILIGENCE_V1_BLUEPRINT.md); step-by-step build order is in [`DILIGENCE_V1_IMPLEMENTATION_PLAN.md`](./DILIGENCE_V1_IMPLEMENTATION_PLAN.md).

## Stack

- Next.js (App Router) + React + TypeScript + Tailwind
- Firebase Auth + Cloud Firestore (client SDK)
- Hosted on Vercel (free) when deployed

## Prerequisites

1. **Node.js** LTS 20.x or 22.x and **npm**
2. **Firebase project** (Spark / free) with:
   - Authentication → Email/Password enabled
   - Cloud Firestore created (production mode is fine)
   - Web app config values available
3. Ownership **Firestore rules** will be published in Phase 2.4 (required before any real user/habit writes)

## Local setup

```powershell
cd C:\Diligence
copy .env.local.example .env.local
```

Fill `.env.local` from your Firebase web config (you can copy values from your local `priv/` notes). Do not commit `.env.local` or live keys.

```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Then:

```powershell
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run start` | Serve production build |
| `npm run lint` | ESLint |

## Current status

**Phase 7 complete (code):** Calendar month grid + summary + day detail modal; Profile stats filled. Firestore rules already cover `habits`, `habitCompletions`, `goals`, `goalCompletions` under `users/{uid}` — re-publish only if you changed `firestore.rules`.

Verify: **/calendar** prev/next, tap a day for detail; **/profile** stats match what you expect.
