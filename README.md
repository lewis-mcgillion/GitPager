# GitPager

A GitHub‑flavoured, internal replacement for PagerDuty — focused on the thing
PagerDuty makes harder than it should be: **coordinating who is on call**.

GitPager rebuilds the on‑call **configuration & visualization** experience with a
clean [Primer](https://primer.style/) UI, so it's obvious **who is on call, when,
and why** — and covering a shift takes a couple of clicks, not a scavenger hunt.

> **No real paging.** GitPager is about *organising* on‑call. Notifications are
> simulated in‑app (a notification centre + incident timeline) behind a pluggable
> notifier, so real channels can be wired in later without touching the UI.

---

## Highlights

- 🗓️ **Who's on call right now** — at a glance, across every team and schedule.
- 📊 **Visual schedule timeline** — a Gantt‑style view of the *resolved* rotation
  (layers + overrides), colour‑coded per person, with a live "now" marker.
- 🔁 **Effortless overrides** — "cover for me" in two clicks; the timeline updates
  immediately.
- 🪜 **Escalation‑policy builder** — ordered levels, reorder up/down, per‑level
  delays, and user *or* schedule targets (schedules resolve to the current on‑call).
- 🚨 **Incidents (secondary)** — trigger / acknowledge / resolve / reassign /
  escalate, each with a full timeline.
- 🔌 **Events API** — a PagerDuty Events‑v2‑style endpoint so monitoring tools can
  trigger incidents programmatically.
- 🌗 **Light & dark** — full Primer theming with no flash on load.

## Tech stack

| Area | Choice |
| --- | --- |
| Framework | [Next.js 16](https://nextjs.org/) (App Router, Turbopack) + React 19 |
| UI | [Primer React](https://primer.style/react) v38 + [Octicons](https://primer.style/octicons) |
| Data | [Prisma ORM](https://www.prisma.io/) + SQLite |
| Auth | OIDC Authorization Code flow (PKCE) + a dev‑login fallback |
| Tests | [Vitest](https://vitest.dev/) |

---

## Getting started

Requires **Node.js 20+** (developed on Node 24).

```bash
# 1. Install dependencies (runs `prisma generate` automatically)
npm install

# 2. Create your local env file (secrets live here — it is gitignored)
cp .env.example .env.local
#   then edit .env.local: set a SESSION_SECRET (openssl rand -hex 32).
#   AUTH_MODE defaults to "dev", so no external IdP is needed to start.

# 3. Create the database and load demo data
npm run db:migrate      # apply the Prisma migration
npm run db:seed         # seed a realistic demo org (teams, schedules, incidents)

# 4. Run it
npm run dev             # http://localhost:3000
```

On first load you'll hit the **sign‑in** page. In dev mode, pick any seeded user
(e.g. **Lewis McGillion**, an admin) to log straight in.

---

## Authentication

GitPager supports two modes, controlled by `AUTH_MODE` in `.env.local`:

### `dev` (default)
A seeded‑user picker — no external identity provider required. Perfect for local
development and demos. Clearly labelled as dev‑only in the UI.

### `oidc`
A standard OAuth2 / OIDC Authorization Code flow (with `state` + PKCE):

1. `/api/auth/login` → redirect to `OIDC_AUTHORIZE_URL`.
2. `/api/auth/callback` → exchange the code at `OIDC_TOKEN_URL`, fetch
   `OIDC_USERINFO_URL`, upsert the `User`, set a signed **httpOnly** session cookie.
3. `/api/auth/logout` → clear the session.

Configure it entirely via env vars (see `.env.example`). The defaults point at an
Okta OIDC application; supply your `OIDC_CLIENT_ID` / `OIDC_CLIENT_SECRET` in
`.env.local` and set `AUTH_MODE="oidc"`.

> 🔐 **Secret safety.** This is a public repo. Real secrets (`OIDC_CLIENT_SECRET`,
> `SESSION_SECRET`) belong **only** in `.env.local`, which is gitignored. The
> committed `.env` holds nothing but the non‑secret SQLite `DATABASE_URL` that the
> Prisma CLI needs. `.env.example` contains placeholders only.

---

## Events API

Monitoring tools can trigger incidents without a user session, authorised by a
service's **integration key** (its `routing_key`). Copy a key from any
**Service → detail** page.

```bash
# Trigger an incident
curl -X POST http://localhost:3000/api/events \
  -H 'Content-Type: application/json' \
  -d '{
    "routing_key": "<integration-key-from-a-service-page>",
    "event_action": "trigger",
    "dedup_key": "high-5xx-api-gateway",
    "payload": {
      "summary": "Elevated 5xx errors on API Gateway",
      "severity": "critical",
      "source": "prometheus"
    }
  }'
```

The response returns a `dedup_key`. Re‑use it to `acknowledge` or `resolve` the
same incident:

```bash
curl -X POST http://localhost:3000/api/events \
  -H 'Content-Type: application/json' \
  -d '{ "routing_key": "<key>", "event_action": "resolve", "dedup_key": "high-5xx-api-gateway" }'
```

Triggering deduplicates on `dedup_key`, assigns the incident based on the
service's escalation policy (resolving schedules to the current on‑call user), and
writes a simulated notification + timeline entry.

---

## How on‑call resolution works

The correctness‑critical logic is pure and unit‑tested:

- **On‑call resolver** (`src/lib/oncall.ts`) — evaluates a schedule's rotation
  layers (turn length, handoff time, start anchor, ordered users) for a given
  instant, then applies any **overrides** on top to produce the effective on‑call
  user. `whoIsOnCall(schedule, at)` and `buildScheduleSegments(schedule, from, to)`
  power the dashboard and the timeline.
- **Escalation resolver** (`src/lib/escalation.ts`) — resolves a policy level's
  targets, turning a schedule target into its current on‑call user.

Run the tests:

```bash
npm run test
```

---

## Project scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Start the dev server (Turbopack) on `:3000` |
| `npm run build` | `prisma generate` + production build |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run test` | Vitest (unit tests) |
| `npm run db:migrate` | Apply Prisma migrations |
| `npm run db:seed` | Seed the demo org |
| `npm run db:reset` | Drop, re‑migrate and re‑seed the database |

---

## Project structure

```
prisma/
  schema.prisma        # 14 models (users, teams, schedules, layers, overrides,
  seed.ts              #   escalation policies/rules/targets, services, incidents…)
src/
  app/
    (app)/             # authenticated app: dashboard, schedules, escalation-
                       #   policies, services, incidents, teams, people, notifications
    api/
      auth/            # OIDC login/callback/logout + dev-login
      events/          # PagerDuty-style Events API
    signin/            # sign-in page
  components/          # Primer building blocks (AppShell, timelines, labels, …)
  lib/                 # on-call & escalation resolvers, incident lifecycle, auth,
                       #   Prisma client, formatting helpers
__tests__/             # Vitest unit tests for the resolvers
```

## Demo data

`npm run db:seed` creates a realistic org: eight users, three teams (Platform,
Payments, SRE), services with integration keys, weekly and daily rotation
schedules (including a "cover for me" override), escalation policies, and a few
sample incidents — so the app is useful the moment it boots.

---

## License

Internal project. Not for external distribution.
