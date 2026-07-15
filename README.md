# GitPager

A GitHub‑flavoured, nicer‑to‑use front end for **PagerDuty on‑call coordination**.
PagerDuty's scheduling UI is clunky; GitPager rebuilds the parts your team touches
most — *who's on call now*, the **rotation timeline**, and **one‑click overrides
("cover a shift")** — with a clean [Primer](https://primer.style/) interface.

GitPager is a **static single‑page app**. There is **no backend**: it talks to the
**PagerDuty REST API directly from your browser** (PagerDuty serves permissive CORS),
authenticating with a **personal PagerDuty API user token** (or, optionally, OAuth 2.0
PKCE where an account admin has registered a scoped app). That's what lets it be hosted
for free on **GitHub Pages**. The API region (US / EU) is detected automatically.

> It does not page anyone. It's a better control panel for the on‑call config that
> already lives in your PagerDuty account.

## Features

- **Dashboard** — who's on call right now across every schedule, plus open incidents.
- **Schedules** — a Gantt‑style timeline of the *rendered* rotation (PagerDuty does
  the rotation math), a colour legend, and **overrides**: cover a shift in two clicks,
  or remove one.
- **Incidents** — filter by status; open an incident to see its timeline and
  **acknowledge / resolve** it.
- **Escalation policies**, **Services**, **Teams**, **People** — clean read views with
  cross‑links (service → policy → schedule → on‑call person).
- Full **light / dark** mode via Primer.

## How authentication works

- **Personal API user token** — the recommended path, and it needs **no admin**. In
  PagerDuty go to your avatar → **My Profile → User Settings → Create API User Token**,
  then paste it on the GitPager sign‑in screen. The token acts with **your own
  permissions** and is stored only in your browser's `localStorage`. (Personal tokens
  require the account to have **Advanced Permissions** enabled.)
- **PagerDuty OAuth (PKCE)** — optional. A *scoped* Public Client app has no secret, so
  the flow runs safely in the browser, but registering one and granting it API scopes
  requires an **account admin**. When a client id is configured, a secondary "Sign in
  with PagerDuty" button appears. (Classic User OAuth is a confidential flow — it needs a
  client secret and a server — so it is **not** used by this static app.)

On a `401` the session is cleared and you're returned to sign‑in. There's no refresh
flow in v1 — you simply sign in again.

## Quick start (local)

```bash
npm install
cp .env.example .env.local     # then edit .env.local (see below)
npm run dev                    # http://localhost:3000
```

You can sign in immediately using a **personal API user token** (no setup, no admin —
see "How authentication works" above). OAuth is optional; to enable it locally, create a
scoped PKCE app (below) and set `NEXT_PUBLIC_PAGERDUTY_CLIENT_ID`.

## (Optional) Create the PagerDuty PKCE app

> Only needed if you want the "Sign in with PagerDuty" OAuth button. It requires an
> **account admin** to register the app and grant scopes. If you're not an admin, use a
> personal API user token instead — everything works the same.

OAuth sign‑in needs a **scoped Public Client** app registered in your PagerDuty account:

1. PagerDuty → **Integrations → App Registration → New App**.
2. Name it "GitPager", choose **OAuth 2.0** as the functionality, then **Public Client**
   (PKCE, **no client secret**).
3. Add these **Redirect URLs** (the trailing slash matters):
   - `http://localhost:3000/callback/` — local dev
   - `https://<your-user>.github.io/<repo>/callback/` — GitHub Pages
     (for this repo: `https://lewis-mcgillion.github.io/GitPager/callback/`)
4. Select scopes matching `NEXT_PUBLIC_PAGERDUTY_SCOPES` (defaults cover read across the
   app plus `schedules.write` and `incidents.write`).
5. Copy the **Client ID** into `NEXT_PUBLIC_PAGERDUTY_CLIENT_ID`. There is no secret to copy.

## Configuration

All build‑time config is **public** (`NEXT_PUBLIC_*`). See `.env.example`.

| Variable | Purpose | Default |
| --- | --- | --- |
| `NEXT_PUBLIC_PAGERDUTY_CLIENT_ID` | Public Client (PKCE) client id. Blank hides OAuth and shows token sign‑in. | `""` |
| `NEXT_PUBLIC_PAGERDUTY_REGION` | Fallback region only — `us` or `eu`. The region is auto‑detected per session, so this rarely matters. | `eu` |
| `NEXT_PUBLIC_BASE_PATH` | Path the app is served under, e.g. `/GitPager` on Pages. | `""` |
| `NEXT_PUBLIC_PAGERDUTY_SCOPES` | Space‑delimited OAuth scopes (subset of the app's grants). | see `.env.example` |

## Deploy to GitHub Pages

A workflow (`.github/workflows/pages.yml`) builds the static export and deploys it.

1. **Settings → Pages → Build and deployment → Source: GitHub Actions.**
2. **Settings → Secrets and variables → Actions → Variables** — add repository
   *Variables* (not secrets; these are public):
   - `PAGERDUTY_CLIENT_ID` — your PKCE client id.
   - `PAGERDUTY_REGION` — `eu` or `us` (optional; defaults to `eu`).
3. Register the Pages **redirect URL** on your PagerDuty app (step 3 above).
4. Push to `main`. The workflow sets `NEXT_PUBLIC_BASE_PATH=/<repo>` automatically,
   builds, and publishes. Your site: `https://<user>.github.io/<repo>/`.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Next dev server on :3000 |
| `npm run build` | Static export to `out/` |
| `npm run serve` | Serve the built `out/` locally |
| `npm run lint` | ESLint |
| `npm test` | Vitest unit tests |

## Security notes

- This repo is **public**. Only non‑secret `NEXT_PUBLIC_*` values are ever built in.
- A PKCE **public client has no secret** — nothing sensitive is embedded in the site.
- A PagerDuty **confidential** app *does* have a secret; it **cannot** be used from a
  browser and must **never** be committed. Keep any such secret out of the tree
  (only in gitignored `.env.local`, and don't prefix it with `NEXT_PUBLIC_`).
- Tokens live in `localStorage`, scoped to your browser/device.

## Tech stack

Next.js 16 (App Router, `output: 'export'`) · React 19 · TypeScript ·
[@primer/react](https://primer.style/) + Octicons · Vitest. No database, no server.

## Scope (v1)

Read + the writes that matter for coordination (**overrides**, **incident ack/resolve**).
Editing schedules/rotations and escalation policies is done in PagerDuty itself and
deep‑linked via "Open in PagerDuty". No real notification delivery — GitPager configures
and visualises on‑call; PagerDuty still does the paging.
