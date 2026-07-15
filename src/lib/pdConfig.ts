// Public, non-secret configuration for talking to PagerDuty directly from the
// browser. GitPager is a static single-page app: there is no server, so it uses
// the OAuth 2.0 Authorization Code + PKCE flow with a *public* client (no secret)
// and calls the PagerDuty REST API directly (PagerDuty serves permissive CORS).
//
// Everything here is safe to ship in client code. A PKCE public client has NO
// client secret — the secret in the downloaded credential file belongs to a
// *confidential* app and must never be embedded in a static site.

export type PdRegion = "us" | "eu";

const REGION = ((process.env.NEXT_PUBLIC_PAGERDUTY_REGION as PdRegion) || "eu").toLowerCase() as PdRegion;

// Client id of the PagerDuty **Public Client (PKCE)** OAuth app. This is public
// by design (it appears in the browser authorize request). Configure it via
// NEXT_PUBLIC_PAGERDUTY_CLIENT_ID at build time.
export const PD_CLIENT_ID = process.env.NEXT_PUBLIC_PAGERDUTY_CLIENT_ID || "";

// basePath the app is served under (e.g. "/GitPager" for a project Pages site).
// Kept in sync with next.config's basePath so redirect URIs resolve correctly.
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";

// Identity host is global and routes to the account's region internally.
export const PD_AUTHORIZE_URL =
  process.env.NEXT_PUBLIC_PAGERDUTY_AUTHORIZE_URL || "https://identity.pagerduty.com/oauth/authorize";
export const PD_TOKEN_URL =
  process.env.NEXT_PUBLIC_PAGERDUTY_TOKEN_URL || "https://identity.pagerduty.com/oauth/token";

// REST API base differs by region. EU accounts must use api.eu.pagerduty.com.
export const PD_API_BASE =
  process.env.NEXT_PUBLIC_PAGERDUTY_API_BASE || (REGION === "us" ? "https://api.pagerduty.com" : "https://api.eu.pagerduty.com");

export const PD_REGION: PdRegion = REGION;

// Space-delimited OAuth scopes. Must be a subset of what the PKCE app was granted
// at registration. Override with NEXT_PUBLIC_PAGERDUTY_SCOPES if your app differs.
export const PD_SCOPES =
  process.env.NEXT_PUBLIC_PAGERDUTY_SCOPES ||
  [
    "openid",
    "profile",
    "email",
    "users.read",
    "teams.read",
    "schedules.read",
    "schedules.write",
    "escalation_policies.read",
    "services.read",
    "oncalls.read",
    "incidents.read",
    "incidents.write",
  ].join(" ");

/** The OAuth redirect URI — computed from the current origin + basePath so the
 *  same build works on localhost and on GitHub Pages. Must be registered on the
 *  PagerDuty app exactly (including the trailing slash). */
export function redirectUri(): string {
  if (typeof window === "undefined") return `${BASE_PATH}/callback/`;
  return `${window.location.origin}${BASE_PATH}/callback/`;
}

/** True when a PKCE client id has been configured at build time. */
export function isOAuthConfigured(): boolean {
  return PD_CLIENT_ID.trim().length > 0;
}
