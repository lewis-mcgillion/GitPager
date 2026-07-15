"use client";

import { Avatar, Button, Flash, Heading, Text, Label } from "@primer/react";
import { MarkGithubIcon, SignInIcon } from "@primer/octicons-react";
import { avatarSrc } from "./ui";

export interface SignInUser {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  githubLogin: string | null;
  role: string;
}

const ERROR_TEXT: Record<string, string> = {
  oidc_disabled: "Single sign-on is not configured. Set AUTH_MODE=oidc and the OIDC_* variables.",
  invalid_state: "Sign-in session expired or was invalid. Please try again.",
  missing_user: "No user was selected.",
  unknown_user: "That user no longer exists.",
  access_denied: "Access was denied by the identity provider.",
};

const border = "1px solid var(--borderColor-default, #d0d7de)";

export function SignInView({
  users,
  oidcEnabled,
  devEnabled,
  error,
}: {
  users: SignInUser[];
  oidcEnabled: boolean;
  devEnabled: boolean;
  error: string | null;
}) {
  const errorText = error ? ERROR_TEXT[error] ?? decodeURIComponent(error) : null;

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
      <div style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <MarkGithubIcon size={40} />
          <Heading as="h1" variant="large" style={{ marginTop: 8 }}>
            GitPager
          </Heading>
          <Text style={{ color: "var(--fgColor-muted)" }}>Internal on-call scheduling & incident response</Text>
        </div>

        {errorText ? (
          <Flash variant="danger" style={{ marginBottom: 16 }}>
            {errorText}
          </Flash>
        ) : null}

        <div style={{ border, borderRadius: 12, overflow: "hidden" }}>
          {oidcEnabled ? (
            <div style={{ padding: 20, borderBottom: devEnabled ? border : undefined }}>
              <Button
                as="a"
                href="/api/auth/login"
                variant="primary"
                size="large"
                block
                leadingVisual={SignInIcon}
              >
                Sign in with SSO
              </Button>
            </div>
          ) : null}

          {devEnabled ? (
            <div style={{ padding: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <Text weight="semibold">Dev sign-in</Text>
                <Label variant="attention">AUTH_MODE=dev</Label>
              </div>
              <Text as="p" style={{ color: "var(--fgColor-muted)", marginTop: 0, marginBottom: 16 }}>
                Choose a seeded user to sign in as. Disable by setting AUTH_MODE=oidc.
              </Text>
              <form method="post" action="/api/auth/dev-login">
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {users.map((u) => (
                    <button
                      key={u.id}
                      type="submit"
                      name="userId"
                      value={u.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "8px 12px",
                        border,
                        borderRadius: 8,
                        background: "transparent",
                        cursor: "pointer",
                        textAlign: "left",
                        color: "inherit",
                        font: "inherit",
                      }}
                    >
                      <Avatar src={avatarSrc(u.avatarUrl)} size={32} />
                      <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                        <span style={{ fontWeight: 600, fontSize: 14 }}>{u.name}</span>
                        <span style={{ fontSize: 12, color: "var(--fgColor-muted, #656d76)" }}>
                          {u.githubLogin ? `@${u.githubLogin}` : u.email}
                          {u.role === "admin" ? " · admin" : ""}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              </form>
            </div>
          ) : null}

          {!oidcEnabled && !devEnabled ? (
            <div style={{ padding: 20 }}>
              <Text style={{ color: "var(--fgColor-muted)" }}>
                No sign-in method is configured. Set AUTH_MODE and the relevant environment
                variables in <code>.env.local</code>.
              </Text>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
