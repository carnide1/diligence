# Diligence

Personal habit, goal, and gym-accountability tracker.

## Stack

- Next.js (App Router) + React + TypeScript + Tailwind
- Firebase Auth + Cloud Firestore (client SDK)
- Email nags: Resend + Vercel Cron + Firebase Admin
- Hosted on Vercel (free) when deployed

## Prerequisites

1. **Node.js** LTS 20.x or 22.x and **npm**
2. **Firebase project** (Spark / free) with:
   - Authentication → Email/Password enabled
   - Cloud Firestore created
   - Web app config values available
3. Deploy updated **Firestore rules** (`firestore.rules`) before relying on gym writes

## Local setup

```powershell
cd C:\Diligence
copy .env.local.example .env.local
```

Fill Firebase `NEXT_PUBLIC_*` values, then:

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
| `npm test` | Unit tests (`lib/**/*.test.ts`) |

## Features

- **Today / Habits / Goals / Calendar / Profile** — daily checkoffs, streaks, history
- **Gym** — exercise library, reusable templates, daily plan → actuals, weight-only progressive acceptance, weekly streak (5 accepted workouts / Mon–Sun week), absences
- **Films** — Letterboxd random pick (auth required on API)
- **Email nags** — overdue habits/goals + gym plan/complete/week-at-risk (Profile toggles)

---

## Email nags setup (free tiers)

Do this once so Vercel can email you on a schedule.

### 1. Resend (sending)

1. Create a free account at [https://resend.com](https://resend.com).
2. **API Keys** → Create API key → copy it.
3. For quick testing you can send **from** `Diligence <onboarding@resend.dev>` (Resend test domain; often limited to your own signup email as recipient).
4. For production, add and verify your domain under **Domains**, then use e.g. `Diligence <nags@yourdomain.com>`.
5. In Vercel → Project → **Settings → Environment Variables** (and in `.env.local` for local cron tests):

```env
RESEND_API_KEY=re_...
RESEND_FROM=Diligence <onboarding@resend.dev>
NEXT_PUBLIC_APP_URL=https://your-vercel-app.vercel.app
```

### 2. Firebase Admin (server reads)

1. Firebase Console → Project **Settings** → **Service accounts**.
2. **Generate new private key** → download JSON.
3. Minify to **one line** (or escape newlines). Set on Vercel / `.env.local`:

```env
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"...@...iam.gserviceaccount.com",...}
```

Never commit this file or key.

### 3. Cron secret

1. Generate a long random string (password manager).
2. Set:

```env
CRON_SECRET=your-long-random-string
```

3. Vercel Cron (`vercel.json` runs daily at 12:00 UTC) will call `/api/cron/nudge`. When `CRON_SECRET` is set, Vercel sends `Authorization: Bearer <CRON_SECRET>`.

### 4. Deploy rules + app

```powershell
firebase deploy --only firestore:rules
git push
```

(Or deploy via Vercel Git integration.)

### 5. Smoke-test locally

With env vars loaded:

```powershell
curl -H "Authorization: Bearer YOUR_CRON_SECRET" http://localhost:3000/api/cron/nudge
```

Expect JSON like `{ "ok": true, "checked": N, "sent": M }`. Check your inbox / Resend dashboard.

### Prefs

Signed-in users control nags under **Profile → Email nags**. Timezone is taken from the browser and stored on the profile.
