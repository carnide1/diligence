# Diligence — V1 Step-by-Step Implementation Plan

**Companion to:** [`DILIGENCE_V1_BLUEPRINT.md`](./DILIGENCE_V1_BLUEPRINT.md)  
**Repo root:** `C:\Diligence`  
**Rule:** Every step below must stay inside the locked V1 blueprint. Do not add reminders, OAuth, Express, Postgres, filters, light mode, or other deferred items.

**Phase 0 status:** ✅ **Done** (Firebase project `diligence-38744`, Auth Email/Password, Firestore, configs under `priv/`). You do **not** recreate the Firebase project. Production-mode Firestore is fine — publish ownership rules in **Step 2.4** so Phases 3+ can write.

---

## V1 technical locks (from plan review)

| Topic | Locked decision |
|---|---|
| Data layout | **Subcollections under user:** `users/{uid}`, `users/{uid}/habits/{habitId}`, `users/{uid}/habitCompletions/{habitId}_{localDate}`, `users/{uid}/goals/{goalId}`, `users/{uid}/goalCompletions/{goalId}_{localDate}` |
| Completion uniqueness | Deterministic doc IDs `{entityId}_{YYYY-MM-DD}` — set/merge, never create duplicates |
| Client vs Admin SDK | **Client SDK only** for V1 — no Firebase Admin SDK / no privileged Next API routes unless forced later |
| Day-boundary catch-up | On app load / Today focus: if `lastResolvedLocalDate < yesterday`, walk **every** missing local date from `lastResolved + 1` through yesterday (habits + goals). No “small window” shortcut |
| Habit streak (daily / weekdays) | On checkoff of a due day: `currentStreak += 1`, update longest. On day-boundary: if due yesterday and incomplete and not paused → `currentStreak = 0` |
| Habit streak (N×/week) | Mid-week skips do not break. At week boundary (Sat→Sun): if completions in that Sun–Sat week `>= n` → `currentStreak += 1` and update longest; if `< n` → `currentStreak = 0` |
| Goals active model | Soft fields: `status: active \| completed \| deleted`. “Today’s goals” = `status == active` (including rollovers). Checkoff writes completion doc for **today** and sets `status = completed`. Incomplete actives roll visually (`createdLocalDate < today`) until completed or deleted |
| Env path | Runtime secrets in gitignored **`.env.local`** at repo root. Source values from existing `priv/` notes; commit only `.env.local.example` with empty placeholders |

---

## How to read this document

| Marker | Meaning |
|---|---|
| **[YOU]** | You must do this (accounts, consoles, secrets, approvals, manual testing on your devices). The agent cannot complete these alone. |
| **[AGENT]** | The coding agent (Auto) will do this in the repo when you ask to proceed with that step. |
| **[YOU → AGENT]** | You provide output (keys, confirmation), then the agent continues. |
| **[SHARED]** | Both: agent prepares; you verify or click through. |

Each step includes:

1. **What** — concrete deliverable  
2. **Why** — why it exists relative to the blueprint  
3. **How** — exact actions / implementation approach  
4. **Done when** — acceptance check  

Work **in order**. Later steps assume earlier ones are done.

---

## Phase 0 — Prerequisites & accounts ✅ DONE

> **No Firebase redo.** Project `diligence-38744`, Auth, and Firestore already exist. Production mode does **not** require recreating the DB — Step 2.4 only publishes rules so the client can read/write your own `users/{uid}` tree. Optional remaining: ensure root `.env.local` exists (from `priv/`), and GitHub remote when you are ready for Vercel.

### Step 0.1 — Confirm tools on your machine  
**Owner: [YOU]** · **Status: done (assumed)**

**What**  
Install/verify Node.js (LTS 20.x or 22.x), Git, and a package manager (we will standardize on **npm** for this repo to avoid Yarn Berry + lockfile confusion called out in the blueprint).

**Why**  
The stack is Next.js + TypeScript. Without Node/npm, the agent cannot run scaffold, install, or local smoke tests on your machine, and you cannot run `npm run dev`.

**How**

1. Open PowerShell.  
2. Run:
   ```powershell
   node -v
   npm -v
   git --version
   ```
3. If Node is missing: install from https://nodejs.org (LTS).  
4. Optional but recommended: install Cursor already (you have it).

**Done when**  
`node -v` and `npm -v` print versions without errors.

---

### Step 0.2 — Create a GitHub repository (optional but recommended before deploy)  
**Owner: [YOU]** · **Status: optional / when ready for Phase 8**

**What**  
Create an empty GitHub repo for Diligence (private recommended — personal habits data may be inferred from commit history/docs; code can be private even if product has open signup).

**Why**  
Blueprint deploys via GitHub → Vercel. A remote also backs up work.

**How**

1. GitHub → New repository → name e.g. `diligence`.  
2. **Do not** add a README/license yet if the agent will scaffold into `C:\Diligence` (avoids merge mess).  
3. Leave remote URL handy for Phase 8.

**Done when**  
Repo exists; you have the clone/remote URL.

> If you prefer local-only until the app works, skip remote until Phase 8. Agent can still scaffold locally.

---

### Step 0.3 — Create Firebase project (Spark / free)  
**Owner: [YOU]** · **Status: ✅ done** (`diligence-38744`)

**What**  
Create a Firebase project for Diligence and enable **Email/Password** authentication + **Cloud Firestore**.

**Why**  
Blueprint §3 and §9.2: Firebase Auth (email/password, open signup, password reset) and Firestore for private per-user data. Free tier only.

**How** (reference only — already completed)

1. Go to https://console.firebase.google.com  
2. **Add project** → name e.g. `diligence` (or `diligence-app`). Disable Google Analytics if you want fewer prompts (optional).  
3. **Build → Authentication → Get started → Sign-in method**  
   - Enable **Email/Password** (not Email link for V1 unless you choose otherwise — blueprint is email/password).  
   - Do **not** enable Google/Apple (blueprint: email/password only).  
4. **Build → Firestore Database → Create database**  
   - **Production mode is correct** for this project (deny-all until rules publish).  
   - Do **not** recreate the database or switch modes to “fix” Phase 0.  
   - Ownership rules are published in **Step 2.4** (before any habit/goal writes).  
   - Region is fixed after creation — leave as-is.  
5. **Project settings (gear) → General → Your apps → Web (`</>`)**  
   - App nickname: `diligence-web`  
   - Config already captured under `priv/`.  
6. (Password reset emails) Authentication → Templates → review Password reset template (default is fine for V1).  
7. Authentication → Settings → **Authorized domains**: `localhost` is there by default; add your Vercel domain later in Phase 8.

**Done when**  
Auth Email/Password is ON. Firestore exists. Web config is available (satisfied).

---

### Step 0.4 — Hand Firebase config to the agent  
**Owner: [YOU → AGENT]** · **Status: nearly done** (`priv/` has values)

**What**  
Runtime env at repo root so Next.js can load Firebase web config. Never commit real values.

**Why**  
Blueprint §9.5: frontend `NEXT_PUBLIC_*` Firebase web config. Client SDK needs these to talk to Auth + Firestore.

**How**

1. You (or agent during Phase 1) create gitignored `C:\Diligence\.env.local` by copying values from `priv/env.example` / `priv/firebase_config` into:
   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY=...
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
   NEXT_PUBLIC_FIREBASE_APP_ID=...
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```
2. Confirm “env is ready” in chat when `.env.local` exists — do **not** paste secrets into chat.  
3. Agent creates `.env.local.example` with **empty placeholders only** (no real keys). Keep `priv/` as your local notebook; do not treat filled `priv/env.example` as a commit-safe template.  
4. Ensure `.gitignore` includes `.env.local` and `priv/` (or at least any file under `priv/` that holds live config).

**Done when**  
`.env.local` exists at repo root; agent has placeholder example file in repo.

---

## Phase 1 — Project scaffold & design system

### Step 1.1 — Scaffold Next.js app in `C:\Diligence`  
**Owner: [AGENT]**  
**Trigger:** You say “do Phase 1” / “scaffold the app”.

**What**  
Create a Next.js App Router + TypeScript + Tailwind project in the Diligence folder (alongside the blueprint docs), using **npm**, single package (not a MaaTRx-style monorepo).

**Why**  
Blueprint §9.2: Next App Router + React + TS + Tailwind; repo under `C:\Diligence`; no Express package.

**How (agent will)**

1. Scaffold with `create-next-app` (App Router, TS, Tailwind, ESLint, `src/` or `app/` at root — prefer `app/` at project root for simplicity).  
2. Preserve existing docs (`DILIGENCE_V1_BLUEPRINT.md`, this plan).  
3. Set `package.json` name to `diligence`.  
4. Add `.gitignore` including `.env.local`, `node_modules`, `.next`.  
5. Add baseline dependencies later as needed: `firebase`, `react-hook-form`, `yup`/`zod`, `react-hot-toast`, icon set (e.g. lucide or FontAwesome — built-in icon picker), drag-and-drop library (e.g. `@dnd-kit/core`).  
6. Verify `npm run dev` starts.

**Done when**  
`http://localhost:3000` loads a placeholder page without errors.

---

### Step 1.2 — Dark theme tokens & global chrome  
**Owner: [AGENT]**

**What**  
Implement dark-navy global styles, CSS variables, base layout shell (nav placeholders), typography, and shared UI primitives (button, modal, progress bar shell) matching blueprint §8.

**Why**  
V1 is dark mode only; mobile-first; crisp cards; green success accents. Doing this once avoids restyling every page later.

**How (agent will)**

1. Edit `app/globals.css` / Tailwind theme: navy/charcoal backgrounds, cool accents, success green.  
2. Choose an expressive non-default font via `next/font` (avoid Inter/Roboto defaults per design preference; still “minimal tool”).  
3. Create `components/ui/` primitives: Button, Modal, ProgressBar, TextInput, etc.  
4. Create logged-in shell: bottom nav (mobile) + side/top nav (desktop) with links to Today, Habits, Goals, Calendar, Profile — pages can be stubs.  
5. No marketing clutter; no purple-gradient AI-default look.

**Done when**  
Stub routes render in dark theme on narrow and wide viewports without looking broken.

---

### Step 1.3 — Document local run instructions  
**Owner: [AGENT]** (+ **[YOU]** verify)

**What**  
Short `README.md`: how to copy env, install, run, and which Firebase features must be enabled.

**Why**  
You need a reliable way to run the app; free-tier ops should be documented without putting secrets in git.

**How**  
Agent writes README from blueprint + this plan. You run install/dev once and confirm.

**Done when**  
You can cold-start the project from README alone.

---

## Phase 2 — Firebase Auth & routing gates

### Step 2.1 — Firebase client SDK + AuthProvider  
**Owner: [AGENT]**

**What**  
`lib/firebase.ts` (init app, `getAuth`, `getFirestore`) and `contexts/AuthContext.tsx` listening with `onAuthStateChanged`, exposing user, loading, login, signup, logout, password reset, update display name helpers.

**Why**  
Blueprint §3 / §9.1: MaaTRx-like AuthContext pattern; email/password; password reset; land on Today after login.

**How (agent will)**

1. Initialize Firebase once from `NEXT_PUBLIC_*` env (client SDK only — no Admin SDK).  
2. Auth methods: `createUserWithEmailAndPassword`, `signInWithEmailAndPassword`, `sendPasswordResetEmail`, `signOut`, `updateProfile` for display name.  
3. Wrap root `app/layout.tsx` with `AuthProvider`.  
4. Do **not** implement custom claims / RBAC.

**Done when**  
Devtools show auth state flipping when signing in/out (once UI exists in 2.2).

---

### Step 2.2 — Landing, login, signup, forgot-password pages  
**Owner: [AGENT]**  
**Verify: [YOU]**

**What**  
Public auth UX:

- Landing (logged out `/`) — short Diligence intro + CTAs to Login / Sign up  
- `/login`, `/signup`, `/forgot-password`  
- Forms validated; toasts on success/error  

**Why**  
Blueprint §4 / §7.6: open signup, password reset, logged-out only sees auth surfaces.

**How (agent will)**

1. Build forms with react-hook-form + zod/yup.  
2. On successful login/signup → `router.replace('/today')`.  
3. Signup should set display name (required or optional-with-default from email prefix — prefer requiring a display name field).  
4. Forgot-password sends Firebase reset email to the address entered.

**How (you will)**

1. Start `npm run dev`.  
2. Create a real test account with your email.  
3. Trigger password reset and confirm email arrives.  
4. Confirm unauthorized `/today` redirects (after Step 2.3).

**Done when**  
You can sign up, log in, reset password, and land on Today.

---

### Step 2.3 — Auth gate for app routes  
**Owner: [AGENT]**

**What**  
Protect `/today`, `/habits`, `/goals`, `/calendar`, `/profile`. Logged-in users hitting `/` or `/login` redirect to `/today`.

**Why**  
Blueprint: only signed-in users see habits/goals; otherwise login. Privacy by routing + Firestore rules (Step 2.4).

**How (agent will)**

1. Client guard component or layout segment `app/(app)/layout.tsx` that waits for auth loading then redirects.  
2. Optional Next middleware is **not** required for V1 (blueprint/MaaTRx pattern: client + server/rules). Prefer layout-level guard for simplicity with Firebase client auth.  
3. Show a minimal loading state (no flicker of private UI).

**Done when**  
Logged out cannot see app pages; logged in cannot stay on landing.

---

### Step 2.4 — Publish Firestore ownership rules (required before Phase 3)  
**Owner: [AGENT] writes rules · [YOU] publish**

**What**  
Deploy rules so an authenticated user can only read/write `users/{uid}/**` where `uid == request.auth.uid`. Deny everything else.

**Why**  
Firestore was created in **production mode** (deny-all). Without this step, Phase 3+ client writes fail. Rules must land **before** user docs / habits / goals — not deferred to calendar phase. Matches blueprint §9.4.

**How**

1. Agent adds `firestore.rules` (and optional `firebase.json` for CLI deploy) matching the locked subcollection layout under `users/{uid}`.  
2. **[YOU]** Firebase Console → Firestore → Rules → paste/publish  
   **or** `firebase login` then `firebase deploy --only firestore:rules`.  
3. Smoke: signed-in user can `setDoc` their own `users/{uid}` (verified in Phase 3.1); unauthenticated reads fail.

**Done when**  
Rules are live on `diligence-38744`. You did **not** recreate Auth or Firestore — only published rules.

---

## Phase 3 — User profile document & day periods

### Step 3.1 — Firestore user document on first login  
**Owner: [AGENT]**

**What**  
On first authenticated session, create `users/{uid}` with: `displayName`, `email`, `createdAt`, default `dayPeriods` (blueprint §6), goal streak fields (`currentStreak`, `longestStreak`, `lastResolvedLocalDate`), any prefs.

**Why**  
Day periods are per-user and editable. Goal streak is global. Profile stats need a home. Blueprint §9.3.

**How (agent will)**

1. `getDoc` / `setDoc` merge if missing.  
2. Seed exact default ranges: Dawning 7–9, Morning 9–12, Noon 12–13, Afternoon 13–18, Dinner 18–19, Evening 19–23, Night 23–7.  
3. Store day-part keys as stable enums: `dawning | morning | noon | afternoon | dinner | evening | night`.  
4. Sync displayName from Auth ↔ Firestore when edited later.

**Done when**  
Signing up creates a readable user doc in Firebase Console → Firestore.

---

### Step 3.2 — Day-period math (no gaps / no overlaps + neighbor adjust)  
**Owner: [AGENT]**

**What**  
Pure utility module: validate full-day cover; when one period’s start/end changes, snap neighbors; reject invalid edits in UI.

**Why**  
Blueprint §6: contiguous 24h; click period on Today → popup; neighbors auto-adjust.

**How (agent will)**

1. Represent times as minutes-from-midnight; handle Night wrapping past midnight.  
2. On edit of period `i` end time → next period’s start becomes that end; similarly for start → previous end.  
3. Unit-test the pure functions if Jest/Vitest is easy to add; otherwise manual checklist in README.  
4. Persist updates to `users/{uid}.dayPeriods`.

**Done when**  
Changing Evening end moves Night start; full day still valid.

---

### Step 3.3 — Profile page (name, email, logout, stub stats)  
**Owner: [AGENT]**  
**Verify: [YOU]**

**What**  
`/profile`: editable display name, email (read-only from Auth), logout button, placeholder slots for stats (filled in Phase 6).

**Why**  
Blueprint §4 / §7.5.

**How**  
Agent builds form + `updateProfile` + Firestore update + `signOut` → `/login`. You verify name persists after refresh.

**Done when**  
Name edit + logout work end-to-end.

---

## Phase 4 — Habits domain

### Step 4.1 — Habit data access layer  
**Owner: [AGENT]**

**What**  
Typed models + Firestore CRUD for habits and habitCompletions under the locked user subcollection paths.

**Why**  
Isolate schedule/streak logic from UI; ownership is inherent in the path (`users/{uid}/…`).

**How (agent will)**

1. Paths (locked): `users/{uid}/habits/{habitId}`, `users/{uid}/habitCompletions/{habitId}_{localDate}`.  
2. Fields: title, description, icon, dayPart, schedule (`everyDay` | `weekdays` + `days[]` | `timesPerWeek` + `n`), `order`, `paused`, `currentStreak`, `longestStreak`, `deletedAt`/`archived` (soft delete; **do not delete completions**). Keep title/icon on the habit doc so calendar can still show soft-deleted habits.  
3. Completions: fields `habitId`, `localDate` (`YYYY-MM-DD`), `completedAt` (Timestamp). Use **deterministic IDs** `{habitId}_{localDate}` with set/merge so double-tap cannot create duplicates.  
4. No Admin SDK; all access via client SDK + rules.

**Done when**  
Agent can create/list habits from temporary UI or Habits page scaffolding.

---

### Step 4.2 — Habit schedule & streak engine  
**Owner: [AGENT]**

**What**  
Pure functions:

- `isHabitDueOn(habit, localDate, completionsThisWeek)` including N×/week visibility  
- `resolveHabitStreakOnDayBoundary(...)` for daily/weekday misses and Sat→Sun N× week resolution  
- Shared catch-up: resolve **every** local date from `lastHabitResolvedLocalDate + 1` through yesterday (store per habit or a user-level cursor — prefer per-habit fields or batch from habit docs’ last resolve + completions; if using a single cursor, it must not skip days)  
- Week = Sunday–Saturday  
- Pause ⇒ not due, streak unchanged  
- No backdating API  

**Why**  
Blueprint streak rules are the product’s core and must be consistent on Today + Calendar.

**How (agent will)**

1. Implement schedule evaluation using device-local date (`date-fns` or temporal helpers).  
2. N×/week **visibility**: show every day until `completionsInWeek >= n`; hide after.  
3. N×/week **streak** (locked): at week boundary only — if week completions `>= n` → `currentStreak += 1` and `longest = max(longest, current)`; if `< n` → `currentStreak = 0`. Mid-week incompleteness does not break.  
4. Every day / weekdays: on successful checkoff of a due day → `currentStreak += 1`, update longest. On day-boundary catch-up: if due that day and not completed and not paused → `currentStreak = 0`.  
5. Catch-up walks **all** missing days in order (not “yesterday only”).  
6. Longest never decreases except via the max() update rule above (longest only grows).

**Done when**  
Agent-written scenarios pass (manual script or tests): daily miss breaks; N=3 week under-complete breaks at week end; N met advances by 1; pause freezes; multi-day absence still resolves correctly.

---

### Step 4.3 — Habits page UI (CRUD modal, pause, delete, streaks)  
**Owner: [AGENT]**  
**Verify: [YOU]**

**What**  
`/habits` list with current/longest; add/edit modal (title, description, icon picker, day-part, schedule controls); pause; soft-delete.

**Why**  
Blueprint §7.2.

**How**  
Agent builds UI. You create habits covering all three schedule types and confirm metrics display.

**Done when**  
All three schedule types can be created and edited; delete removes from list but old completions remain in Firestore.

---

### Step 4.4 — Built-in icon picker  
**Owner: [AGENT]**

**What**  
Fixed catalog of icons (water, book, dumbbell, etc.) stored as string keys on habits/goals.

**Why**  
Blueprint: built-in only; no uploads (also avoids Firebase Storage cost/complexity).

**How**  
Map icon keys → components; modal grid picker; default icon if missing (calendar history for deleted habits may still store key).

**Done when**  
Picker works on habit create/edit (reused later for goals).

---

## Phase 5 — Goals domain

### Step 5.1 — Goal data access + rollover  
**Owner: [AGENT]**

**What**  
`users/{uid}/goals/{goalId}` + `users/{uid}/goalCompletions/{goalId}_{localDate}`. Goals have no schedule. Unfinished goals stay `status: active` and appear on subsequent days with leftover styling until completed or deleted.

**Why**  
Blueprint §5.3: today-only creation; rollover until done/deleted; leftovers visually marked.

**How (agent will)**

1. Creating a goal stamps `createdLocalDate = today`, `status = active`.  
2. “Goals for today” query: `status == active` (includes earlier-created rollovers).  
3. Leftover visual if `createdLocalDate < today`.  
4. Checkoff today: write completion doc `{goalId}_{today}` + set `status = completed`. Undo: delete today’s completion doc (if that is how completion was recorded) and restore `status = active` when appropriate.  
5. Delete goal: `status = deleted` (soft); keep completion history.  
6. No future scheduling.

**Done when**  
A goal left unchecked still appears next calendar day with leftover styling (simulate by temporarily changing local date in tests or waiting overnight / clock skew test helper in dev only).

---

### Step 5.2 — Global goal streak engine  
**Owner: [AGENT]**

**What**  
Resolve per local day (using user fields `currentStreak`, `longestStreak`, `lastResolvedLocalDate`):

- 0 active goals that day → **pause** (no change to current streak)  
- ≥1 goals; all completed by end of day → advance current; update longest  
- any incomplete at day boundary → current = 0; incompletes remain as `active` rollovers  

Creation time irrelevant.

**Why**  
Blueprint §5.3 goal streak rules.

**How**  
On app load / Today focus: if `lastResolvedLocalDate < yesterday`, walk **every** missing local date from `lastResolvedLocalDate + 1` through yesterday in order, applying the rules above, then set `lastResolvedLocalDate = yesterday`. Never allow completing “yesterday” from UI.

**Done when**  
Scenarios match blueprint: empty day pauses; unfinished breaks; all done advances; multi-day absence still resolves correctly.

---

### Step 5.3 — Goals page UI  
**Owner: [AGENT]**  
**Verify: [YOU]**

**What**  
`/goals`: top current + longest streaks; list; add/edit modal (same fields as habits minus repetition); leftover badge.

**Why**  
Blueprint §7.3.

**Done when**  
You can CRUD goals and see streak numbers update after day-boundary resolution logic runs in testing.

---

## Phase 6 — Today page (main surface)

### Step 6.1 — Compose Today feed  
**Owner: [AGENT]**

**What**  
`/today` loads due habits + active goals, groups by day-part (user ranges shown on headers), interleaves with `Habit:` / `Goal:` labels, respects manual `order` within part, excludes paused habits, hides N× habits that already met weekly quota.

**Why**  
Blueprint §7.1 — Today is the primary product surface.

**How**  
Combine queries + schedule engine; sort by day-part enum order then `order`.

**Done when**  
Real data appears in correct sections.

---

### Step 6.2 — Checkoff + undo + timestamps  
**Owner: [AGENT]**  
**Verify: [YOU]**

**What**  
Toggle completion for **today only**; write `completedAt = now`; undo deletes today’s completion doc and adjusts streak fields per engine rules.

**Why**  
Blueprint: one completion/day with exact time; undo yes; no late checkoff.

**How**  
Disable or omit UI for other dates on Today. Toast on error.

**Done when**  
You check/uncheck; Firestore shows timestamp; streaks move sensibly.

---

### Step 6.3 — Progress bar + joint celebration  
**Owner: [AGENT]**

**What**  
Progress = completed / (due habits + active goals). Show “All done” / day completed only when **both** sets are fully clear (if one set empty, treat that set as satisfied for celebration purposes — e.g. no habits due + all goals done can celebrate; if no goals and all habits done, celebrate; if neither item exists, calm empty state not fireworks).

**Why**  
Blueprint §7.1 + your clarification: celebrate only when both are fully clear. Empty sets shouldn’t permanently block celebration.

**How**  
`habitsComplete = dueHabits.length === 0 || all due done`  
`goalsComplete = activeGoals.length === 0 || all done`  
Celebrate iff both true and at least one item existed **or** show empty “add a habit or goal” when zero items.

**Done when**  
Celebration matches the matrix above.

---

### Step 6.4 — Day-part header edit popup  
**Owner: [AGENT]**  
**Verify: [YOU]**

**What**  
Click section header → modal to edit that period’s range → neighbor adjust → save to user doc → UI refreshes labels.

**Why**  
Blueprint §6.

**Done when**  
You edit ranges on phone-width UI; neighbors update; refresh persists.

---

### Step 6.5 — Drag-and-drop reorder within day-part  
**Owner: [AGENT]**  
**Verify: [YOU]**

**What**  
DnD for habits and goals within the same day-part on Today (and preferably same ordering reflected on Habits/Goals lists). Persist `order` values.

**Why**  
Blueprint: day-part then manual drag-and-drop.

**How**  
`@dnd-kit` or equivalent; on drag end, write new orders in batch. Cross-day-part drag **out of scope** unless trivial — changing day-part remains an edit-modal field.

**Done when**  
Reorder survives refresh.

---

## Phase 7 — Calendar + profile stats (+ rules re-verify)

### Step 7.1 — Calendar month view + summary  
**Owner: [AGENT]**

**What**  
`/calendar`: month grid; top summary (counts/rates/streaks); shared cell styling for completion vs miss; **no filters**.

**Why**  
Blueprint §7.4.

**How**  

1. Build month matrix in local TZ.  
2. Load habits (including soft-deleted that have history) + **one range query** for completions in the visible month (and goals/goalCompletions as needed). Evaluate schedules **in memory** — do not hit Firestore per day.  
3. Future days: scheduled habits only (upcoming).  
4. Past/today: check / x style indicators per blueprint (shared style until popup).  
5. Soft-deleted habits still resolve title/icon from the habit doc for past completions.

**Done when**  
Month navigates prev/next; summary numbers look sane.

---

### Step 7.2 — Day detail popup (hover + tap)  
**Owner: [AGENT]**  
**Verify: [YOU]**

**What**  
Hover (desktop) / tap (mobile) opens popup: titles, icons, timestamps or “not completed”; future shows scheduled habits without requiring completion.

**Why**  
Blueprint §7.4 / decision: shared cell style until popup shows titles/icons.

**Done when**  
Works on touch and mouse.

---

### Step 7.3 — Profile interesting stats  
**Owner: [AGENT]**

**What**  
Fill profile: goal streaks, best habit streak, month completion %, active habit/goal counts (blueprint §4).

**Why**  
Approved stats set.

**How**  
Aggregate from habits + completions for current month local dates.

**Done when**  
Stats match manual counts for a test account.

---

### Step 7.4 — Re-verify Firestore rules (already live from 2.4)  
**Owner: [YOU]** (+ **[AGENT]** if rules need a tweak)

**What**  
Confirm production rules still match the shipped paths; run the two-account privacy test again before/with deploy.

**Why**  
Rules were required early for development. This step is a **gate**, not the first publish — only revise if Phase 4–6 added paths that rules do not cover.

**How**

1. Diff `firestore.rules` against actual collections used.  
2. Test with two accounts: user A must not read user B.  
3. Publish only if something changed since Step 2.4.

**Done when**  
Second account cannot access first account’s data; unauthenticated reads fail.

---

## Phase 8 — Deploy (Vercel free)

### Step 8.1 — Connect repo to Vercel  
**Owner: [YOU]**  
**Support: [AGENT]** (ensure build works, env var names documented)

**What**  
Deploy Next.js to Vercel free tier.

**Why**  
Blueprint hosting choice; no Cloud Run.

**How (you)**

1. Push `C:\Diligence` to GitHub (if not already).  
2. https://vercel.com → Import project → select repo.  
3. Framework: Next.js (auto).  
4. Add **Environment Variables** matching `.env.local` (`NEXT_PUBLIC_FIREBASE_*`, `NEXT_PUBLIC_APP_URL=https://your-deployment.vercel.app`).  
5. Deploy.  
6. Firebase Auth → Authorized domains → add `your-deployment.vercel.app` (and custom domain later if any).  
7. Auth email templates: action URL / continue URL should work with your domain (Firebase default handler is usually enough for password reset).

**How (agent)**  
Fix any build errors (`next build`). Ensure no secrets committed. Update README with production steps.

**Done when**  
Production URL loads; signup/login works on phone using the live URL.

---

### Step 8.2 — Production smoke test checklist  
**Owner: [YOU]**

**What**  
Run blueprint §13 success criteria on a real phone + desktop against production.

**Why**  
Local-only is not enough for timezone, Auth authorized domains, and mobile chrome.

**How — checklist**

- [ ] Sign up / login / password reset / logout  
- [ ] Edit display name on profile  
- [ ] Create habits: every day, weekdays, N×/week  
- [ ] Pause habit; confirm hidden on Today; streak unchanged  
- [ ] Checkoff + undo; timestamp in calendar popup  
- [ ] Soft-delete habit; history still on calendar  
- [ ] Goals create; leftover rollover visual; goal streaks  
- [ ] Day-part edit adjusts neighbors  
- [ ] Drag reorder persists  
- [ ] Celebrate only when both sides clear  
- [ ] Calendar month summary + future upcoming  
- [ ] Second account cannot see first account’s data  

**Done when**  
All boxes checked → V1 shippable.

---

## Phase 9 — Handoff & freeze

### Step 9.1 — Mark V1 complete in docs  
**Owner: [AGENT]** after you confirm smoke test

**What**  
Update blueprint status / this plan with “V1 shipped” date and known limitations (if any), without expanding scope. Note device-local timezone / multi-device clock skew as a known V1 limitation.

**Why**  
Keep docs as source of truth.

---

### Step 9.2 — Backlog only (do not implement unless requested)  
**Owner: [SHARED] decisions later**

Explicit non-goals remain: reminders, events, gym contract, monetization, OAuth, filters, export, offline, light mode, Express/SQL.

---

## Quick reference — Who does what

| Step | Owner | Status |
|---|---|---|
| 0.1 Install Node/npm/git | **YOU** | Done (assumed) |
| 0.2 GitHub repo | **YOU** | Optional until deploy |
| 0.3 Firebase project + Auth + Firestore | **YOU** | ✅ Done — do not recreate |
| 0.4 `.env.local` from `priv/` | **YOU** → agent | Copy to root if missing |
| 1.x Scaffold, theme, README | **AGENT** | Next |
| 2.1–2.3 Auth UI + gates | **AGENT** (you test) | Pending |
| 2.4 Publish Firestore ownership rules | **YOU** deploy · **AGENT** writes | Required before Phase 3 |
| 3.x User doc + day periods + profile shell | **AGENT** (you verify) | Pending |
| 4.x Habits engine + UI | **AGENT** (you verify schedules) | Pending |
| 5.x Goals engine + UI | **AGENT** (you verify rollover/streaks) | Pending |
| 6.x Today page | **AGENT** (you verify UX) | Pending |
| 7.1–7.3 Calendar + stats | **AGENT** (you verify) | Pending |
| 7.4 Re-verify rules | **YOU** | Gate only (rules already from 2.4) |
| 8.1 Vercel + Firebase authorized domains | **YOU** · agent fixes build | Pending |
| 8.2 Production smoke test | **YOU** | Pending |
| 9.1 Doc freeze | **AGENT** after your OK | Pending |

---

## How to proceed with the agent

Phase 0 is complete. When ready for coding work, say e.g.:

- “Start Step 1.1”  
- Or: “Implement Phases 1–2” (includes writing rules; you publish in 2.4)

Ensure root `.env.local` exists (from `priv/`) before Auth/Firestore feature verification.

---

## Adherence note

If a future idea conflicts with [`DILIGENCE_V1_BLUEPRINT.md`](./DILIGENCE_V1_BLUEPRINT.md), **update the blueprint first**, then this plan — do not silently expand V1 during implementation.
