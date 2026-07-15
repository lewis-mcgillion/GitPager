import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { getOidcConfig, exchangeCodeForTokens, fetchUserInfo } from "@/lib/oidc";
import { createSessionToken, sessionCookieOptions, SESSION_COOKIE } from "@/lib/session";

// Completes the OIDC flow: validates state, exchanges the code, fetches userinfo,
// upserts the local user, and sets the session cookie.
export async function GET(req: Request) {
  const config = getOidcConfig();
  if (!config) {
    return NextResponse.redirect(new URL("/signin?error=oidc_disabled", req.url));
  }

  const url = new URL(req.url);
  const providerError = url.searchParams.get("error");
  if (providerError) {
    return NextResponse.redirect(new URL(`/signin?error=${encodeURIComponent(providerError)}`, req.url));
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const store = await cookies();
  const expectedState = store.get("oidc_state")?.value;
  const verifier = store.get("oidc_verifier")?.value;

  if (!code || !state || !expectedState || state !== expectedState || !verifier) {
    return NextResponse.redirect(new URL("/signin?error=invalid_state", req.url));
  }

  try {
    const tokens = await exchangeCodeForTokens(config, code, verifier);
    const claims = await fetchUserInfo(config, tokens.access_token);

    const email = claims.email ?? `${claims.sub}@oidc.local`;
    const name = claims.name ?? claims.preferred_username ?? email;
    const login = claims.preferred_username ?? null;

    const user = await db.user.upsert({
      where: { email },
      update: { name, avatarUrl: claims.picture ?? undefined, githubLogin: login ?? undefined },
      create: {
        email,
        name,
        avatarUrl: claims.picture ?? null,
        githubLogin: login,
        role: "member",
      },
    });

    const token = await createSessionToken({
      id: user.id,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
      role: user.role,
    });

    const res = NextResponse.redirect(new URL("/dashboard", req.url));
    res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
    // Clear handshake cookies.
    for (const c of ["oidc_state", "oidc_nonce", "oidc_verifier"]) {
      res.cookies.set(c, "", { path: "/", maxAge: 0 });
    }
    return res;
  } catch (e) {
    const message = e instanceof Error ? e.message : "oidc_failed";
    return NextResponse.redirect(new URL(`/signin?error=${encodeURIComponent(message)}`, req.url));
  }
}
