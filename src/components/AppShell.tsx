"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NavList, Avatar, ActionMenu, ActionList, CounterLabel } from "@primer/react";
import {
  MarkGithubIcon,
  HomeIcon,
  AlertIcon,
  StackIcon,
  CalendarIcon,
  WorkflowIcon,
  OrganizationIcon,
  PersonIcon,
  BellIcon,
  SignOutIcon,
  type Icon,
} from "@primer/octicons-react";
import { ColorModeToggle } from "./ColorModeToggle";
import { avatarSrc } from "./ui";
import type { SessionUser } from "@/lib/session";

interface NavItem {
  href: string;
  label: string;
  icon: Icon;
}

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: HomeIcon },
  { href: "/incidents", label: "Incidents", icon: AlertIcon },
  { href: "/services", label: "Services", icon: StackIcon },
  { href: "/schedules", label: "Schedules", icon: CalendarIcon },
  { href: "/escalation-policies", label: "Escalation policies", icon: WorkflowIcon },
  { href: "/teams", label: "Teams", icon: OrganizationIcon },
  { href: "/people", label: "People", icon: PersonIcon },
  { href: "/notifications", label: "Notifications", icon: BellIcon },
];

const border = "1px solid var(--borderColor-default, var(--color-border-default, #d0d7de))";

export function AppShell({
  user,
  notificationCount = 0,
  children,
}: {
  user: SessionUser;
  notificationCount?: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div style={{ display: "grid", gridTemplateColumns: "260px minmax(0, 1fr)", minHeight: "100vh" }}>
      <aside
        style={{
          borderRight: border,
          display: "flex",
          flexDirection: "column",
          position: "sticky",
          top: 0,
          height: "100vh",
        }}
      >
        <Link
          href="/dashboard"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "16px",
            borderBottom: border,
            textDecoration: "none",
            color: "inherit",
            fontWeight: 600,
            fontSize: 16,
          }}
        >
          <MarkGithubIcon size={24} />
          <span>GitPager</span>
        </Link>

        <div style={{ padding: 8, overflowY: "auto", flex: 1 }}>
          <NavList>
            {NAV.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + "/");
              const ItemIcon = item.icon;
              return (
                <NavList.Item
                  key={item.href}
                  as={Link}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                >
                  <NavList.LeadingVisual>
                    <ItemIcon />
                  </NavList.LeadingVisual>
                  {item.label}
                  {item.href === "/notifications" && notificationCount > 0 ? (
                    <NavList.TrailingVisual>
                      <CounterLabel variant="primary">{notificationCount}</CounterLabel>
                    </NavList.TrailingVisual>
                  ) : null}
                </NavList.Item>
              );
            })}
          </NavList>
        </div>

        <div style={{ padding: 12, borderTop: border, fontSize: 12, color: "var(--fgColor-muted, #656d76)" }}>
          GitPager · internal on-call
        </div>
      </aside>

      <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
        <header
          style={{
            height: 56,
            borderBottom: border,
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 4,
            padding: "0 16px",
            position: "sticky",
            top: 0,
            background: "var(--bgColor-default, #fff)",
            zIndex: 5,
          }}
        >
          <ColorModeToggle />
          <ActionMenu>
            <ActionMenu.Anchor>
              <button
                type="button"
                aria-label="Open user menu"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  padding: "4px 6px",
                  borderRadius: 6,
                  color: "inherit",
                  font: "inherit",
                }}
              >
                <Avatar src={avatarSrc(user.avatarUrl)} size={24} />
                <span style={{ fontSize: 14, fontWeight: 500 }}>{user.name}</span>
              </button>
            </ActionMenu.Anchor>
            <ActionMenu.Overlay align="end">
              <ActionList>
                <ActionList.Group>
                  <ActionList.GroupHeading>Signed in as {user.name}</ActionList.GroupHeading>
                  <ActionList.Item disabled>{user.email}</ActionList.Item>
                </ActionList.Group>
                <ActionList.Divider />
                <ActionList.LinkItem href="/api/auth/logout">
                  <ActionList.LeadingVisual>
                    <SignOutIcon />
                  </ActionList.LeadingVisual>
                  Sign out
                </ActionList.LinkItem>
              </ActionList>
            </ActionMenu.Overlay>
          </ActionMenu>
        </header>

        <main style={{ flex: 1, padding: 24, minWidth: 0, maxWidth: 1200, width: "100%" }}>{children}</main>
      </div>
    </div>
  );
}
