import { beforeEach, describe, expect, it } from "vitest";
import {
  pkceChallengeS256,
  buildAuthorizeUrl,
  authHeader,
  isAuthenticated,
  signInWithToken,
  logout,
  getStoredUser,
  setStoredUser,
} from "@/lib/pdAuth";

const TOKEN_KEY = "gitpager.pd.auth";

beforeEach(() => {
  window.localStorage.clear();
});

describe("pkceChallengeS256", () => {
  it("matches the RFC 7636 Appendix B test vector", async () => {
    const verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
    const challenge = await pkceChallengeS256(verifier);
    expect(challenge).toBe("E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM");
  });

  it("produces URL-safe base64 without padding", async () => {
    const challenge = await pkceChallengeS256("another-random-verifier-value-1234567890");
    expect(challenge).not.toMatch(/[+/=]/);
  });
});

describe("buildAuthorizeUrl", () => {
  it("includes the required OAuth + PKCE parameters", () => {
    const url = new URL(
      buildAuthorizeUrl({
        clientId: "client-123",
        redirectUri: "https://example.com/GitPager/callback/",
        scopes: "openid schedules.read",
        state: "state-xyz",
        codeChallenge: "challenge-abc",
      }),
    );
    expect(url.origin + url.pathname).toBe("https://identity.pagerduty.com/oauth/authorize");
    const p = url.searchParams;
    expect(p.get("response_type")).toBe("code");
    expect(p.get("client_id")).toBe("client-123");
    expect(p.get("redirect_uri")).toBe("https://example.com/GitPager/callback/");
    expect(p.get("scope")).toBe("openid schedules.read");
    expect(p.get("state")).toBe("state-xyz");
    expect(p.get("code_challenge")).toBe("challenge-abc");
    expect(p.get("code_challenge_method")).toBe("S256");
  });
});

describe("authHeader", () => {
  it("uses the Token scheme for REST API tokens", () => {
    signInWithToken("api-token-value");
    expect(authHeader()).toBe("Token token=api-token-value");
  });

  it("uses the Bearer scheme for OAuth access tokens", () => {
    window.localStorage.setItem(TOKEN_KEY, JSON.stringify({ scheme: "bearer", accessToken: "oauth-xyz" }));
    expect(authHeader()).toBe("Bearer oauth-xyz");
  });

  it("returns null when unauthenticated", () => {
    expect(authHeader()).toBeNull();
  });
});

describe("isAuthenticated", () => {
  it("is false with no stored auth", () => {
    expect(isAuthenticated()).toBe(false);
  });

  it("is true for a token scheme", () => {
    signInWithToken("tok");
    expect(isAuthenticated()).toBe(true);
  });

  it("is false for an expired bearer token", () => {
    window.localStorage.setItem(
      TOKEN_KEY,
      JSON.stringify({ scheme: "bearer", accessToken: "x", expiresAt: Date.now() - 1000 }),
    );
    expect(isAuthenticated()).toBe(false);
  });

  it("is true for a non-expired bearer token", () => {
    window.localStorage.setItem(
      TOKEN_KEY,
      JSON.stringify({ scheme: "bearer", accessToken: "x", expiresAt: Date.now() + 60_000 }),
    );
    expect(isAuthenticated()).toBe(true);
  });
});

describe("user + logout", () => {
  it("round-trips the stored user and clears everything on logout", () => {
    signInWithToken("tok");
    setStoredUser({ id: "PU1", name: "Ada", email: "ada@example.com", avatarUrl: null });
    expect(getStoredUser()?.name).toBe("Ada");
    logout();
    expect(getStoredUser()).toBeNull();
    expect(authHeader()).toBeNull();
    expect(isAuthenticated()).toBe(false);
  });
});
