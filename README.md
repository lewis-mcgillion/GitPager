# GitPager

A GitHub‑flavoured, nicer‑to‑use front end for **PagerDuty on‑call coordination**.
PagerDuty's scheduling UI is clunky; GitPager rebuilds the parts your team touches
most — *who's on call now*, the **rotation timeline**, and **one‑click overrides
("cover a shift")** — with a clean [Primer](https://primer.style/) interface.

GitPager is a **static single‑page app**. There is **no backend**: it talks to the
**PagerDuty REST API directly from your browser** (PagerDuty serves permissive CORS),
authenticating with **OAuth 2.0 Authorization Code + PKCE** (a public client — no
secret). That's what lets it be hosted for free on **GitHub Pages**.

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

- **PagerDuty OAuth (PKCE)** — the recommended path. A *Public Client* app has **no
  secret**, so the whole flow runs safely in the browser. The access token is kept in
  `localStorage` (the standard SPA trade‑off for an internal tool with no server).
- **REST API token** — a fallback for quick local use. Paste a PagerDuty user/general
  access token on the sign‑in screen. It's stored only in your browser.

On a `401` the session is cleared and you're returned to sign‑in. There's no refresh
flow in v1 — you simply sign in again.

## Quick start (local)

```bash
npm install
cp .env.example .env.local     # then edit .env.local (see below)
npm run dev                    # http://localhost:3000
```

You can sign in immediately using a **REST API token** (no setup). To use OAuth
locally, create a PKCE app (below) and set `NEXT_PUBLIC_PAGERDUTY_CLIENT_ID`.

## Create the PagerDuty PKCE app (one‑time)

OAuth sign‑in needs a **Public Client** app registered in *your* PagerDuty account:

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
| `NEXT_PUBLIC_PAGERDUTY_REGION` | `eu` (`api.eu.pagerduty.com`) or `us` (`api.pagerduty.com`). | `eu` |
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
