import { NextResponse } from "next/server";
import {
  getOidcConfig,
  isOidcEnabled,
  base64UrlRandom,
  pkceChallengeS256,
  buildAuthorizeUrl,
} from "@/lib/oidc";

// Starts the OIDC Authorization Code + PKCE flow: stashes state/nonce/verifier in
// short-lived httpOnly cookies and redirects to the provider's authorize endpoint.
export async function GET(req: Request) {
  const config = getOidcConfig();
  if (!isOidcEnabled() || !config) {
    return NextResponse.redirect(new URL("/signin?error=oidc_disabled", req.url));
  }

  const state = base64UrlRandom();
  const nonce = base64UrlRandom();
  const verifier = base64UrlRandom(48);
  const challenge = pkceChallengeS256(verifier);
  const authorizeUrl = buildAuthorizeUrl(config, { state, codeChallenge: challenge, nonce });

  const res = NextResponse.redirect(authorizeUrl);
  const opts = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600, // 10 minutes to complete the handshake
  };
  res.cookies.set("oidc_state", state, opts);
  res.cookies.set("oidc_nonce", nonce, opts);
  res.cookies.set("oidc_verifier", verifier, opts);
  return res;
}
