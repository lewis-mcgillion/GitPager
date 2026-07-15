"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, TextInput, Text, Heading, Flash } from "@primer/react";
import { MarkGithubIcon, KeyIcon } from "@primer/octicons-react";
import { beginLogin, signInWithToken, setStoredUser, logout, type PdUserRef } from "@/lib/pdAuth";
import { getCurrentUser } from "@/lib/pdApi";
import { isOAuthConfigured, PD_REGION } from "@/lib/pdConfig";

const border = "1px solid var(--borderColor-default, #d0d7de)";

export default function SignInPage() {
  const router = useRouter();
  const configured = isOAuthConfigured();
  const [showToken, setShowToken] = useState(!configured);
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
      const pu = await getCurrentUser();
      const mapped: PdUserRef = { id: pu.id, name: pu.name, email: pu.email, avatarUrl: pu.avatar_url };
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

          {configured ? (
            <Button variant="primary" block size="large" onClick={onOAuth} disabled={busy}>
              Sign in with PagerDuty
            </Button>
          ) : (
            <Flash style={{ marginBottom: 16 }}>
              OAuth isn&apos;t configured for this deployment. Set{" "}
              <code>NEXT_PUBLIC_PAGERDUTY_CLIENT_ID</code> to enable single sign-on, or use a REST API token
              below.
            </Flash>
          )}

          {configured ? (
            <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "16px 0" }}>
              <div style={{ flex: 1, height: 1, background: "var(--borderColor-default, #d0d7de)" }} />
              <Text style={{ fontSize: 12, color: "var(--fgColor-muted, #656d76)" }}>or</Text>
              <div style={{ flex: 1, height: 1, background: "var(--borderColor-default, #d0d7de)" }} />
            </div>
          ) : null}

          {showToken ? (
            <form onSubmit={onToken}>
              <label htmlFor="pd-token" style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                PagerDuty REST API token
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
              <Text style={{ display: "block", fontSize: 12, color: "var(--fgColor-muted, #656d76)", margin: "6px 0 12px" }}>
                A user or general-access token for the {PD_REGION.toUpperCase()} region. Stored only in your browser.
              </Text>
              <Button type="submit" block disabled={busy || !token.trim()}>
                Continue with token
              </Button>
            </form>
          ) : (
            <Button variant="invisible" block leadingVisual={KeyIcon} onClick={() => setShowToken(true)}>
              Use a REST API token instead
            </Button>
          )}
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
