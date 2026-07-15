"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, TextInput, Text, Heading, Flash } from "@primer/react";
import { MarkGithubIcon, KeyIcon } from "@primer/octicons-react";
import { beginLogin, signInWithToken, setStoredUser, logout, type PdUserRef } from "@/lib/pdAuth";
import { getCurrentUser, detectAndStoreRegion } from "@/lib/pdApi";
import { isOAuthConfigured } from "@/lib/pdConfig";

const border = "1px solid var(--borderColor-default, #d0d7de)";

export default function SignInPage() {
  const router = useRouter();
  const oauthAvailable = isOAuthConfigured();
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onOAuth() {
    setError(null);
    setBusy(true);
    try {
      await beginLogin("/dashboard/");
    } catch (e) {
      setBusy(false);
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function onToken(e: React.FormEvent) {
    e.preventDefault();
    if (!token.trim()) return;
    setError(null);
    setBusy(true);
    signInWithToken(token);
    try {
      await detectAndStoreRegion();
      const pu = await getCurrentUser();
      const mapped: PdUserRef = {
        id: pu.id,
        name: pu.name,
        email: pu.email,
        avatarUrl: pu.avatar_url,
        teams: pu.teams?.map((t) => ({ id: t.id, name: t.summary ?? "" })),
      };
      setStoredUser(mapped);
      router.replace("/dashboard/");
    } catch (err) {
      logout();
      setBusy(false);
      setError(
        err instanceof Error
          ? `Could not authenticate with that token: ${err.message}`
          : "Could not authenticate with that token.",
      );
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <MarkGithubIcon size={40} />
          <Heading as="h1" style={{ fontSize: 26, marginTop: 12 }}>
            Sign in to GitPager
          </Heading>
          <Text style={{ color: "var(--fgColor-muted, #656d76)", fontSize: 14 }}>
            A cleaner on-call experience, powered by your PagerDuty account.
          </Text>
        </div>

        <div style={{ border, borderRadius: 12, padding: 24, background: "var(--bgColor-default, #fff)" }}>
          {error ? (
            <Flash variant="danger" style={{ marginBottom: 16 }}>
              {error}
            </Flash>
          ) : null}

          <form onSubmit={onToken}>
            <label htmlFor="pd-token" style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
              PagerDuty API user token
            </label>
            <TextInput
              id="pd-token"
              block
              type="password"
              monospace
              placeholder="u+XXXXXXXXXXXXXXXXXXXX"
              leadingVisual={KeyIcon}
              value={token}
              onChange={(e) => setToken(e.target.value)}
              autoComplete="off"
            />
            <Text
              style={{ display: "block", fontSize: 12, color: "var(--fgColor-muted, #656d76)", margin: "8px 0 14px" }}
            >
              In PagerDuty go to your avatar →{" "}
              <strong>My Profile → User Settings → Create API User Token</strong>. The token acts with your own
              permissions and is stored only in this browser — it never leaves your device.
            </Text>
            <Button type="submit" variant="primary" block size="large" disabled={busy || !token.trim()}>
              {busy ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          {oauthAvailable ? (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "16px 0" }}>
                <div style={{ flex: 1, height: 1, background: "var(--borderColor-default, #d0d7de)" }} />
                <Text style={{ fontSize: 12, color: "var(--fgColor-muted, #656d76)" }}>or</Text>
                <div style={{ flex: 1, height: 1, background: "var(--borderColor-default, #d0d7de)" }} />
              </div>
              <Button variant="invisible" block leadingVisual={MarkGithubIcon} onClick={onOAuth} disabled={busy}>
                Sign in with PagerDuty (OAuth)
              </Button>
              <Text
                as="p"
                style={{ textAlign: "center", fontSize: 11, color: "var(--fgColor-muted, #656d76)", margin: "6px 0 0" }}
              >
                Requires an admin-configured scoped OAuth app.
              </Text>
            </>
          ) : null}
        </div>

        <Text
          as="p"
          style={{ textAlign: "center", fontSize: 12, color: "var(--fgColor-muted, #656d76)", marginTop: 16 }}
        >
          GitPager talks to PagerDuty directly from your browser. Your token never leaves your device.
        </Text>
      </div>
    </div>
  );
}
