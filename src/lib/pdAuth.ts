"use client";

// Browser-side authentication for GitPager.
//
// Primary flow: OAuth 2.0 Authorization Code + PKCE against PagerDuty, run
// entirely in the browser (public client, no secret). The access token is kept
// in localStorage — this is the standard SPA trade-off. For an internal tool
// this is acceptable; there is no server to hold an httpOnly cookie.
//
// Dev/fallback: paste a PagerDuty REST API token (`Authorization: Token token=`)
// to use the app without the OAuth dance. Handy for local development.

import {
  PD_AUTHORIZE_URL,
  PD_TOKEN_URL,
  PD_CLIENT_ID,
  PD_SCOPES,
  redirectUri,
} from "./pdConfig";

const TOKEN_KEY = "gitpager.pd.auth";
const USER_KEY = "gitpager.pd.user";
const PKCE_KEY = "gitpager.pd.pkce";

export type AuthScheme = "bearer" | "token";

export interface StoredAuth {
  scheme: AuthScheme;
  accessToken: string;
  refreshToken?: string | null;
  /** Epoch milliseconds when the access token expires (bearer only). */
  expiresAt?: number | null;
}

export interface PdUserRef {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
}

// ---------------------------------------------------------------------------
// PKCE helpers (Web Crypto — available in every modern browser)
// ---------------------------------------------------------------------------

function base64UrlEncode(bytes: Uint8Array): string {
  let str = "";
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function randomString(byteLength = 48): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}

export async function pkceChallengeS256(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return base64UrlEncode(new Uint8Array(digest));
}

export function buildAuthorizeUrl(params: {
  clientId: string;
  redirectUri: string;
  scopes: string;
  state: string;
  codeChallenge: string;
}): string {
  const url = new URL(PD_AUTHORIZE_URL);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", params.clientId);
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("scope", params.scopes);
  url.searchParams.set("state", params.state);
  url.searchParams.set("code_challenge", params.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  return url.toString();
}

// ---------------------------------------------------------------------------
// Token storage
// ---------------------------------------------------------------------------

export function getStoredAuth(): StoredAuth | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(TOKEN_KEY);
    return raw ? (JSON.parse(raw) as StoredAuth) : null;
  } catch {
    return null;
  }
}

function setStoredAuth(auth: StoredAuth | null) {
  if (typeof window === "undefined") return;
  if (auth) window.localStorage.setItem(TOKEN_KEY, JSON.stringify(auth));
  else window.localStorage.removeItem(TOKEN_KEY);
}

export function getStoredUser(): PdUserRef | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as PdUserRef) : null;
  } catch {
    return null;
  }
}

export function setStoredUser(user: PdUserRef | null) {
  if (typeof window === "undefined") return;
  if (user) window.localStorage.setItem(USER_KEY, JSON.stringify(user));
  else window.localStorage.removeItem(USER_KEY);
}

export function isAuthenticated(): boolean {
  const a = getStoredAuth();
  if (!a) return false;
  if (a.scheme === "bearer" && a.expiresAt && Date.now() >= a.expiresAt) return false;
  return Boolean(a.accessToken);
}

/** Authorization header value for API requests, or null when unauthenticated. */
export function authHeader(): string | null {
  const a = getStoredAuth();
  if (!a?.accessToken) return null;
  return a.scheme === "token" ? `Token token=${a.accessToken}` : `Bearer ${a.accessToken}`;
}

export function logout() {
  setStoredAuth(null);
  setStoredUser(null);
}

// ---------------------------------------------------------------------------
// OAuth flow
// ---------------------------------------------------------------------------

/** Kick off the PKCE login: stash verifier+state, then redirect to PagerDuty. */
export async function beginLogin(returnTo = "/dashboard/"): Promise<void> {
  const verifier = randomString(48);
  const state = randomString(16);
  const challenge = await pkceChallengeS256(verifier);
  window.sessionStorage.setItem(PKCE_KEY, JSON.stringify({ verifier, state, returnTo }));
  window.location.href = buildAuthorizeUrl({
    clientId: PD_CLIENT_ID,
    redirectUri: redirectUri(),
    scopes: PD_SCOPES,
    state,
    codeChallenge: challenge,
  });
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  token_type?: string;
  expires_in?: number;
  scope?: string;
}

/** Exchange the authorization code for tokens (no client secret — PKCE). */
export async function completeLogin(search: string): Promise<{ returnTo: string }> {
  const params = new URLSearchParams(search);
  const error = params.get("error");
  if (error) {
    throw new Error(params.get("error_description") || error);
  }
  const code = params.get("code");
  const state = params.get("state");
  if (!code || !state) throw new Error("Missing code or state in callback.");

  const raw = window.sessionStorage.getItem(PKCE_KEY);
  if (!raw) throw new Error("Missing PKCE verifier — please start sign-in again.");
  const pkce = JSON.parse(raw) as { verifier: string; state: string; returnTo: string };
  if (pkce.state !== state) throw new Error("State mismatch — possible CSRF, aborting.");

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri(),
    client_id: PD_CLIENT_ID,
    code_verifier: pkce.verifier,
  });

  const res = await fetch(PD_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token exchange failed (${res.status}): ${text}`);
  }
  const tokens = (await res.json()) as TokenResponse;
  window.sessionStorage.removeItem(PKCE_KEY);

  setStoredAuth({
    scheme: "bearer",
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token ?? null,
    expiresAt: tokens.expires_in ? Date.now() + tokens.expires_in * 1000 : null,
  });

  return { returnTo: pkce.returnTo || "/dashboard/" };
}

/** Dev fallback: authenticate with a PagerDuty REST API token. Not a hook —
 *  named with a verb so it can be called from event handlers. */
export function signInWithToken(token: string) {
  setStoredAuth({ scheme: "token", accessToken: token.trim() });
}
