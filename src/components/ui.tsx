"use client";

import React from "react";
import Link from "next/link";
import { Avatar, Text, Spinner, Button } from "@primer/react";

const border = "1px solid var(--borderColor-default, #d0d7de)";

// GitHub's "ghost" avatar, used as a fallback when a user has no avatar URL.
// Avatar requires a non-empty string src in Primer v38.
export const GHOST_AVATAR = "https://github.com/ghost.png";

export function avatarSrc(url?: string | null): string {
  return url && url.length > 0 ? url : GHOST_AVATAR;
}

// A Next.js Link styled for wrapping cards/rows: no underline and, crucially,
// `color: inherit` inline so the link text uses the surrounding default text
// color. Primer's BaseStyles applies a class-based `a { color: accent }` rule
// that only an inline style reliably overrides.
export function CardLink({
  href,
  children,
  style,
  ariaLabel,
}: {
  href: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
  ariaLabel?: string;
}) {
  return (
    <Link
      href={href}
      aria-label={ariaLabel}
      style={{ color: "inherit", textDecoration: "none", ...style }}
    >
      {children}
    </Link>
  );
}

export function Card({
  children,
  style,
  padded = false,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
  padded?: boolean;
}) {
  return (
    <div
      style={{
        border,
        borderRadius: 12,
        background: "var(--bgColor-default, #fff)",
        overflow: "hidden",
        ...(padded ? { padding: 16 } : {}),
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function CardRow({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 16px",
        borderTop: border,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export interface InlineUser {
  name: string;
  avatarUrl?: string | null;
  githubLogin?: string | null;
}

export function UserInline({
  user,
  size = 20,
  showLogin = false,
  unassignedLabel = "Unassigned",
}: {
  user: InlineUser | null;
  size?: number;
  showLogin?: boolean;
  unassignedLabel?: string;
}) {
  if (!user) {
    return <Text style={{ color: "var(--fgColor-muted)" }}>{unassignedLabel}</Text>;
  }
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, minWidth: 0 }}>
      <Avatar src={avatarSrc(user.avatarUrl)} size={size} />
      <span style={{ minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {user.name}
        {showLogin && user.githubLogin ? (
          <span style={{ color: "var(--fgColor-muted, #656d76)" }}> @{user.githubLogin}</span>
        ) : null}
      </span>
    </span>
  );
}

export function EmptyState({
  title,
  description,
  icon,
}: {
  title: string;
  description?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--fgColor-muted, #656d76)" }}>
      {icon ? <div style={{ marginBottom: 8 }}>{icon}</div> : null}
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{title}</div>
      {description ? <div style={{ fontSize: 13 }}>{description}</div> : null}
    </div>
  );
}

export function Loading({ label = "Loading…" }: { label?: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        padding: "48px 20px",
        color: "var(--fgColor-muted, #656d76)",
      }}
    >
      <Spinner size="small" />
      <span>{label}</span>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div style={{ padding: "32px 20px", textAlign: "center" }}>
      <div style={{ color: "var(--fgColor-danger, #cf222e)", fontWeight: 600, marginBottom: 6 }}>
        Something went wrong
      </div>
      <div
        style={{
          color: "var(--fgColor-muted, #656d76)",
          fontSize: 13,
          marginBottom: 12,
          wordBreak: "break-word",
        }}
      >
        {message}
      </div>
      {onRetry ? <Button onClick={onRetry}>Retry</Button> : null}
    </div>
  );
}
