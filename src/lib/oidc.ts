import crypto from "node:crypto";

// Env-configurable OIDC / OAuth2 Authorization Code flow (with PKCE). All
// endpoints and credentials come from environment variables so GitPager can
// point at any compliant provider (defaults documented toward Okta OIDC).

export type AuthMode = "dev" | "oidc";

export interface OidcConfig {
  authorizeUrl: string;
  tokenUrl: string;
  userinfoUrl: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string;
}

export function getAuthMode(): AuthMode {
  return process.env.AUTH_MODE === "oidc" ? "oidc" : "dev";
}

/** Returns the OIDC config if fully configured, otherwise null. */
export function getOidcConfig(): OidcConfig | null {
  const authorizeUrl = process.env.OIDC_AUTHORIZE_URL;
  const tokenUrl = process.env.OIDC_TOKEN_URL;
  const userinfoUrl = process.env.OIDC_USERINFO_URL;
  const clientId = process.env.OIDC_CLIENT_ID;
  const clientSecret = process.env.OIDC_CLIENT_SECRET;
  const redirectUri = process.env.OIDC_REDIRECT_URI || "http://localhost:3000/api/auth/callback";
  const scopes = process.env.OIDC_SCOPES || "openid profile email";

  if (!authorizeUrl || !tokenUrl || !userinfoUrl || !clientId || !clientSecret) {
    return null;
  }
  return { authorizeUrl, tokenUrl, userinfoUrl, clientId, clientSecret, redirectUri, scopes };
}

/** Whether the real OIDC sign-in path is available. */
export function isOidcEnabled(): boolean {
  return getAuthMode() === "oidc" && getOidcConfig() !== null;
}

/** Whether the seeded-user dev-login path is allowed. */
export function isDevLoginEnabled(): boolean {
  return getAuthMode() === "dev";
}

export function base64UrlRandom(bytes = 32): string {
  return crypto.randomBytes(bytes).toString("base64url");
}

/** PKCE S256 code challenge for a given verifier. */
export function pkceChallengeS256(verifier: string): string {
  return crypto.createHash("sha256").update(verifier).digest("base64url");
}

export function buildAuthorizeUrl(
  config: OidcConfig,
  params: { state: string; codeChallenge: string; nonce: string },
): string {
  const url = new URL(config.authorizeUrl);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("scope", config.scopes);
  url.searchParams.set("state", params.state);
  url.searchParams.set("nonce", params.nonce);
  url.searchParams.set("code_challenge", params.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  return url.toString();
}

export interface TokenResponse {
  access_token: string;
  id_token?: string;
  token_type?: string;
  expires_in?: number;
  scope?: string;
}

export async function exchangeCodeForTokens(
  config: OidcConfig,
  code: string,
  codeVerifier: string,
): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: config.redirectUri,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code_verifier: codeVerifier,
  });

  const res = await fetch(config.tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body,
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token exchange failed (${res.status}): ${text}`);
  }
  return (await res.json()) as TokenResponse;
}

export interface OidcUserInfo {
  sub: string;
  name?: string;
  preferred_username?: string;
  email?: string;
  picture?: string;
}

export async function fetchUserInfo(config: OidcConfig, accessToken: string): Promise<OidcUserInfo> {
  const res = await fetch(config.userinfoUrl, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Userinfo request failed (${res.status}): ${text}`);
  }
  return (await res.json()) as OidcUserInfo;
}
