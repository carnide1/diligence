# Diligence — V1 Product & Technical Blueprint

**Status:** Locked for V1 implementation  
**Last updated:** 2026-07-14  
**Working location:** `C:\Diligence`

This document is the single source of truth for Diligence V1: product scope, rules, UX, stack, and what is explicitly deferred.

---

## 1. Product summary

**Diligence** is a personal habit and daily-goal tracker. It exists because existing habit apps do not combine:

- Unlimited habits with flexible schedules
- Streaks that reset when a scheduled day (or N×/week target) is missed
- Completion timestamps and a calendar history that shows *when* things were done
- Separate **daily goals** (one-shot / same-day) with their own all-or-nothing streak
- A Today view grouped by editable day-parts, with easy checkoff

V1 is that core — nothing more. The product should feel like a **minimal accountability tool**: dark navy, crisp lines, cool accents (see aesthetic section). It is **not** a gamified social network or a general calendar/reminder app.

---

## 2. Product principles

| Principle | Decision |
|---|---|
| Privacy | Each user’s habits/goals are private. Only signed-in users see their own data. |
| Accounts | Required from day one (Firebase Auth). Avoids a later rework and prevents a public editable board. |
| Cost | Free tiers only (Vercel + Firebase). No paid services required for V1. |
| Complexity | Lighter than MaaTRx: one Next.js app, no separate Express/Cloud Run API. |
| Mobile | Mobile-first, but fully usable on desktop (not awkward on either). |
| Language | English only. |
| Online | Online-only; no offline-first sync, no push notifications, no data export in V1. |

---

## 3. Audience & accounts

- **Open signup:** Anyone can create an account.
- **Auth:** Firebase Authentication, email/password only (same identity pattern as MaaTRx, not MaaTRx’s claim-heavy RBAC).
- **Password reset:** Supported on the landing/auth flow via Firebase.
- **Access model:**
  - Logged out → landing / sign-in / sign-up / forgot-password only
  - Logged in → app pages; data scoped to that user’s Firebase UID
- **Post-login destination:** Today
- **Profile:** Editable display name, email (from auth), interesting summary stats, logout
- **Monetization:** None in V1
- **Gym contract / proof-of-gym:** Explicitly out of scope (was a V2 idea; deferred)

### Why accounts in V1 (strategy)

Without accounts, Diligence would either be device-local (painful to migrate) or a shared public site (anyone could edit “your” habits). Adding `user_id` and auth later would touch every query and the entire security model. Firebase Auth on the free tier is cheap insurance and matches the intended multi-user future.

---

## 4. V1 page map

| Page | Route (suggested) | Purpose |
|---|---|---|
| Landing / Auth | `/` (logged out), `/login`, `/signup`, `/forgot-password` | Marketing-lite + email/password sign-in, sign-up, password reset |
| Today | `/today` (or `/` when logged in) | Main surface: habits + goals for today, by day-part, checkoff |
| Habits | `/habits` | List, add/edit/delete habits; show current + longest streak per habit |
| Goals | `/goals` | List, add/edit/delete goals; show global goal current + longest streak |
| Calendar | `/calendar` | Month history + upcoming; summary stats on top; day detail popup |
| Profile | `/profile` | Name (editable), email, interesting stats, logout |

**V1 = these surfaces only.** No reminders/events page, no gym page, no admin console.

### Suggested profile stats (approved “you decide” set)

- Current / longest **daily-goals** streak
- Best **habit** current or longest streak (highlight top habit)
- Completion rate this month (habits scheduled vs done)
- Total active habits / goals count

---

## 5. Core concepts

### 5.1 Habits

Recurring behaviors on a schedule.

**Fields**

| Field | Notes |
|---|---|
| Title | Required |
| Description | Optional |
| Icon | Built-in icon picker only (no uploads) |
| Day-part | One of the built-in periods (see §6) |
| Schedule / repetition | See §5.2 |
| Manual sort order | Within day-part (drag-and-drop) |
| Paused | Optional; while paused: not on Today, streak unchanged (neither grows nor breaks) |
| Metrics | **Current streak** and **longest streak** only (“scores”) |

**Completions**

- At most **one completion per habit per calendar day** (local device timezone)
- Store exact **`completed_at` timestamp**
- Undo (uncheck) allowed
- **No late checkoff** for previous days — cannot mark yesterday done today; cannot restore a broken streak by backdating

**Delete behavior**

- Soft-remove from active lists as needed, but **do not wipe history** — past completions remain visible on the calendar

### 5.2 Habit schedules

Week definition: **Sunday → Saturday**.

| Schedule type | Behavior |
|---|---|
| Every day | Appears every day; missing a day breaks current streak |
| Specific weekdays | One or more weekdays; appears only on those days; missing a scheduled day breaks streak |
| N times per week | Target N completions in the current Sun–Sat week |

**N× per week rules (locked)**

- Habit appears on Today **every day of the week until N completions are reached** for that week
- Example: N=3; complete Mon → still shows Tue; skip Tue (streak not broken mid-week solely for that skip) → shows again Wed; etc.
- Once N is hit in the week, habit **disappears** from Today until the next Sunday
- **Streak fails** if, at week end (Saturday end / local midnight into Sunday), completions that week are **&lt; N**
- Mid-week incompleteness does not by itself break the streak before the week is over; the week boundary is the fail check for N× habits

**Streak rules (habits, general)**

- Missing a day you were obligated to complete breaks **current** streak → 0
- **Longest** streak never decreases
- Pause does not change streak values
- Timezone = **device local time**
- **No grace period** (no “counts until 3am”); day boundary is local midnight

### 5.3 Daily goals

Things that must get done **that day** — not a repeating schedule. If it should recur, it should be a habit.

**Fields**

Same as habits **except no repetition/schedule**: title, description, icon, day-part, manual order within day-part.

**Lifecycle**

- Created for **today only** (no scheduling for future dates)
- Unfinished goals **roll over** to the next day until completed or deleted
- Rolled-over goals show a clear **visual treatment / icon** (“leftover”) so they are obvious on Today and Goals

**Goal streak (global, not per-goal)**

- Displayed prominently on the Goals page (and suitable elsewhere): **current** + **longest**
- A day **advances** the streak if **every** goal that belongs to that day (including rolled-over ones present that day) is completed by local midnight
- Creation time during the day does **not** matter — only “was everything done by midnight?”
- If any goal is unfinished at midnight → streak **breaks**; unfinished items roll to the next day
- Days with **zero goals** → streak **pauses** (neither fail nor advance)

**Same completion rules as habits:** one completion per goal instance per day with timestamp; undo allowed; no backdating.

### 5.4 Habits vs goals (difference)

| | Habits | Goals |
|---|---|---|
| Cadence | Scheduled / recurring | That day (or rolled leftover) |
| Streak | Per habit | One global “all goals done today” streak |
| On Calendar | Completion history + upcoming schedule | Whether that day’s goals were fully cleared |

---

## 6. Day periods

Built-in standard periods (defaults):

| Period | Default range |
|---|---|
| Dawning | 7:00–9:00 |
| Morning | 9:00–12:00 |
| Noon | 12:00–13:00 |
| Afternoon | 13:00–18:00 |
| Dinner | 18:00–19:00 |
| Evening | 19:00–23:00 |
| Night | 23:00–7:00 |

**Rules**

- Stored **per user** (editable)
- Ranges must **cover 24 hours with no gaps and no overlaps**
- On **Today**, items are grouped by day-part; each group header shows the **current time range**
- Clicking a day-part header opens a **popup to edit that period’s range**
- Editing one period **automatically adjusts neighboring periods** so the full day stays contiguous and valid

**Ordering on Today / lists**

1. By day-part (canonical order above)
2. Within a day-part: **manual order via drag-and-drop**

---

## 7. Page behavior detail

### 7.1 Today

- Primary home after login
- Shows all **habits due today** (per schedule rules, excluding paused) and **goals for today** (including rollovers)
- **Interleaved by day-part**, with clear labels such as `Habit: …` / `Goal: …`
- Easy checkoff + undo
- **Progress bar** for overall today completion
- Empty / success states: prefer “day completed” / “all done” style messaging
- **Celebrate only when both** all due habits **and** all goals for the day are fully clear (independent tracking underneath; joint celebration on Today)

### 7.2 Habits page

- List all habits with metrics (current + longest streak)
- Add / edit via **modal/popup** on this page
- Delete without wiping historical completions
- Pause / unpause supported

### 7.3 Goals page

- Top: **longest** and **current** goal streaks
- List today’s goals (and rolled leftovers as applicable) with edit/delete
- Add / edit via modal similar to habits (no repetition field)

### 7.4 Calendar page

- **Month** grid
- High-level cell style: shared completion styling (check / x style indicators for habits and goals — one shared visual language until detail)
- **Hover or tap** → popup for that day:
  - Each habit/goal title + icon
  - Completion timestamp, or not completed
- **Future days:** show upcoming scheduled habits in the popup/hover
- **No filters** in V1
- **Simple summary** at the top of the page (counts / rates / streaks at a glance)

### 7.5 Profile page

- Editable display name
- Email (from Firebase)
- Interesting stats (see §4)
- Logout

### 7.6 Landing / auth

- Open signup + login + password reset
- Logged-in users should not stay on marketing chrome; send them into the app (Today)

---

## 8. Visual / UX direction

Inspired by a dark habit-tracker aesthetic (navy/charcoal surfaces, crisp rounded cards, cool accents, green success signals, clean sans typography, readable mobile stats/calendar patterns).

| Choice | V1 |
|---|---|
| Theme | **Dark mode only** |
| Tone | Minimal tool — not playful coach spam |
| Accent | Cool shades; green for completion/success |
| Density | Clear hierarchy; avoid dashboard clutter on Today |
| Charts | Calendar summary may use simple visuals; full “statistics suite” like dense multi-widget dashboards is optional polish, not required to ship V1 core |

---

## 9. Technical strategy

### 9.1 What we reuse from MaaTRx (patterns, not the monorepo)

Keep:

- Next.js App Router + React + TypeScript + Tailwind
- Root layout providers (e.g. AuthProvider)
- Firebase client auth patterns (auth state listener, email/password, password reset)
- Form patterns (`react-hook-form` + validation), toasts, icon usage
- Private app data keyed by Firebase UID
- Env-based config; secrets never committed

Drop / do not copy for V1:

- Separate Express API on Cloud Run
- Knex / Cloud SQL / Docker API image
- Custom claims RBAC (`admin`, `*_access`, etc.)
- Domain integrations (OpenAI, Tableau, Discourse, HubSpot, DPD, shortages, MediMatch, SynapseRx, etc.)
- Gamification seasons, org lists, admin analytics
- Yarn monorepo with `maatrx-web` + `backend` packages

### 9.2 Chosen V1 stack

| Layer | Choice | Rationale |
|---|---|---|
| App | Next.js (App Router) + React + TypeScript + Tailwind | MaaTRx-like frontend skeleton; one deployable |
| Hosting | Vercel (free) | Fits Next; user preference |
| Auth | Firebase Auth (email/password) | MaaTRx-like; free tier; open signup + reset |
| Database | **Cloud Firestore** | Same Google free-tier ecosystem as Auth; no separate Postgres/Cloud Run cost; enough for personal/small multi-user |
| Repo | New app under `C:\Diligence` | Not inside MaaTRx monorepo |
| Package manager | Prefer Yarn or npm consistently in-repo (document one) | Avoid mixed lockfile confusion |

**No separate backend service for V1.** Use the Next.js app + Firebase client SDK (and Admin SDK in Next server routes only if needed for privileged ops). Security rules on Firestore enforce `request.auth.uid` ownership.

### 9.3 Suggested data model (logical)

Exact collection names can evolve during implementation; ownership field is mandatory.

| Entity | Key fields (conceptual) |
|---|---|
| `users/{uid}` | displayName, email, createdAt, dayPeriods (7 ranges), preferences |
| `habits/{id}` | userId, title, description, icon, dayPart, scheduleType + schedule config, order, paused, currentStreak, longestStreak, archived/deleted flag |
| `habitCompletions/{id}` | userId, habitId, localDate, completedAt |
| `goals/{id}` | userId, title, description, icon, dayPart, order, createdLocalDate, status (active/completed/deleted), rolledFromDate? |
| `goalCompletions/{id}` | userId, goalId, localDate, completedAt |
| `goalStreak/{uid}` or fields on user | currentStreak, longestStreak, lastResolvedLocalDate |

**Streak computation strategy:** Prefer updating streak fields on checkoff / at day-boundary resolution in app logic; calendar reads completions by `localDate`. Document timezone as device-local; store `localDate` (YYYY-MM-DD) explicitly alongside UTC timestamps to avoid ambiguity.

### 9.4 Security

- Firestore rules: user can only read/write documents where `userId == request.auth.uid` (or doc id == uid for profile)
- No public lists of habits/goals
- Client never trusts “is admin” flags for V1 (no multi-tenant admin product)

### 9.5 Env vars (names only — categories)

**Frontend (`NEXT_PUBLIC_*`):** Firebase web config, app URL if needed.

**Server (if Admin SDK used):** Firebase project credentials / application default pattern as appropriate for Vercel.

Align naming with MaaTRx-style Firebase env conventions where practical.

---

## 10. Explicitly out of V1 (deferred)

| Idea | Status |
|---|---|
| Reminders / push / email nudges | Deferred |
| One-time calendar events | Deferred |
| Gym contract / proof uploads | Deferred (forget for now) |
| Monetization / plans | Deferred (none) |
| Calendar filters | Deferred (removed from V1) |
| Late/backdated completions | Not wanted |
| Grace period past midnight | Not wanted |
| Custom uploaded icons | Not wanted |
| Offline mode | Not wanted |
| Data export CSV/JSON | Not wanted |
| i18n / French | Not wanted |
| Light mode | Not wanted |
| Google/Apple OAuth | Not wanted (email/password only) |
| Separate Express + Cloud SQL stack | Not for V1 |

**Possible V2 themes (not designed yet):** reminders/events, richer analytics, gym-contract page, optional OAuth, Postgres if query needs outgrow Firestore.

---

## 11. Implementation order (recommended)

1. Scaffold Next.js + Tailwind + Firebase Auth (landing, signup, login, reset, auth gate)
2. **Publish Firestore ownership rules** (production-mode DB cannot write until this exists)
3. User profile + default day-periods; day-period edit popup with neighbor auto-adjust
4. Habits CRUD + schedules + Today checkoff + streak updates
5. Goals CRUD + rollover + goal streak + Today interleave
6. Calendar month + day popup + top summary
7. Profile stats + polish (progress bar, empty/all-done states, drag-and-drop ordering)
8. Vercel deploy (+ re-verify rules)

Exact step list, ownership, and locked data/streak details live in [`DILIGENCE_V1_IMPLEMENTATION_PLAN.md`](./DILIGENCE_V1_IMPLEMENTATION_PLAN.md).

---

## 12. Decision log (quick reference)

| Topic | Decision |
|---|---|
| Name | **Diligence** (final) |
| Accounts | Yes, day one, Firebase free Auth |
| Signup | Open |
| Password reset | Yes |
| Display name | Editable on profile |
| Backend | Next + Firebase Auth + Firestore; Vercel; no Express |
| Pages | Landing/Auth, Today, Habits, Goals, Calendar, Profile |
| Day-parts | 7 built-ins; user-editable; no gaps/overlaps; click header to edit; neighbors adjust |
| Habit schedules | Every day; specific weekdays; N×/week (Sun–Sat rules above) |
| Habit scores | Current + longest streak only |
| Completions | One/day + timestamp; undo yes; backdate no |
| Pause | Yes; streak frozen |
| Delete habit | Keep history |
| Goals | Today-only; rollover; same fields minus schedule |
| Goal streak | All goals done by midnight; empty day pauses; unfinished breaks |
| Today layout | Interleaved by day-part; Habit/Goal labels; progress bar; celebrate only if both fully clear |
| Order | Day-part then drag-and-drop |
| Calendar | Month; shared cell style; hover/tap detail; upcoming; summary on top; no filters |
| Theme | Dark navy minimal; inspiration from provided habit-stats/calendar aesthetic |
| Locale / timezone | English; device local time; no grace |
| Cost | Free only |
| Repo | `C:\Diligence` |

---

## 13. Success criteria for V1 ship

A signed-in user can:

1. Create an account, reset a password, edit their name, and log out  
2. Define habits with icons, day-parts, and all three schedule types  
3. Check them off on Today with timestamps and see streaks update correctly (including N×/week and pause)  
4. Create goals, roll them over, and maintain a global goal streak correctly  
5. Edit day-part ranges from Today without leaving gaps/overlaps  
6. Reorder items within a day-part via drag-and-drop  
7. Review a month calendar with day detail (times, titles, icons) and upcoming habits  
8. Use the app comfortably on phone and desktop in dark theme  

When those work, V1 is done.
