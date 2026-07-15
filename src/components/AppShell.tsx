"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Avatar, IconButton, Text } from "@primer/react";
import {
  MarkGithubIcon,
  HomeIcon,
  AlertIcon,
  ServerIcon,
  CalendarIcon,
  ListOrderedIcon,
  PeopleIcon,
  PersonIcon,
  SignOutIcon,
} from "@primer/octicons-react";
import type { Icon } from "@primer/octicons-react";
import { ColorModeToggle } from "@/components/ColorModeToggle";
import { avatarSrc } from "@/components/ui";
import { logout, type PdUserRef } from "@/lib/pdAuth";
import { PD_REGION } from "@/lib/pdConfig";

interface NavItem {
  href: string;
  label: string;
  icon: Icon;
}

const NAV: NavItem[] = [
  { href: "/dashboard/", label: "Dashboard", icon: HomeIcon },
  { href: "/incidents/", label: "Incidents", icon: AlertIcon },
  { href: "/services/", label: "Services", icon: ServerIcon },
  { href: "/schedules/", label: "Schedules", icon: CalendarIcon },
  { href: "/escalation-policies/", label: "Escalation policies", icon: ListOrderedIcon },
  { href: "/teams/", label: "Teams", icon: PeopleIcon },
  { href: "/people/", label: "People", icon: PersonIcon },
];

const border = "1px solid var(--borderColor-default, #d0d7de)";

export function AppShell({ user, children }: { user: PdUserRef | null; children: React.ReactNode }) {
  const pathname = usePathname() || "";
  const router = useRouter();

  function onSignOut() {
    logout();
    router.replace("/signin/");
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Top bar */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          padding: "12px 20px",
          borderBottom: border,
          background: "var(--bgColor-inset, var(--bgColor-muted, #f6f8fa))",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <Link
          href="/dashboard/"
          style={{ display: "inline-flex", alignItems: "center", gap: 10, color: "inherit", textDecoration: "none" }}
        >
          <MarkGithubIcon size={28} />
          <span style={{ fontWeight: 700, fontSize: 18, letterSpacing: "-0.01em" }}>GitPager</span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "var(--fgColor-muted, #656d76)",
              border,
              borderRadius: 999,
              padding: "1px 8px",
            }}
          >
            {PD_REGION.toUpperCase()}
          </span>
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <ColorModeToggle />
          {user ? (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8, minWidth: 0 }}>
              <Avatar src={avatarSrc(user.avatarUrl)} size={24} />
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  maxWidth: 160,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {user.name}
              </span>
            </span>
          ) : null}
          <IconButton icon={SignOutIcon} aria-label="Sign out" variant="invisible" onClick={onSignOut} />
        </div>
      </header>

      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        {/* Sidebar */}
        <nav
          aria-label="Primary"
          style={{
            width: 236,
            flexShrink: 0,
            borderRight: border,
            padding: "16px 12px",
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          {NAV.map((item) => {
            const active = pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "7px 10px",
                  borderRadius: 8,
                  color: "inherit",
                  textDecoration: "none",
                  fontSize: 14,
                  fontWeight: active ? 600 : 400,
                  background: active ? "var(--bgColor-muted, #f6f8fa)" : "transparent",
                  boxShadow: active ? "inset 2px 0 0 var(--fgColor-accent, #0969da)" : "none",
                }}
              >
                <span style={{ color: active ? "var(--fgColor-accent, #0969da)" : "var(--fgColor-muted, #656d76)" }}>
                  <Icon size={16} />
                </span>
                {item.label}
              </Link>
            );
          })}

          <div style={{ marginTop: "auto", paddingTop: 16 }}>
            <Text style={{ fontSize: 11, color: "var(--fgColor-muted, #656d76)" }}>
              Proxying the PagerDuty API directly from your browser.
            </Text>
          </div>
        </nav>

        {/* Main content */}
        <main style={{ flex: 1, minWidth: 0, padding: "28px 32px" }}>
          <div style={{ maxWidth: 1120, margin: "0 auto" }}>{children}</div>
        </main>
      </div>
    </div>
  );
}
