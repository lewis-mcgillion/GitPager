"use client";

import { Button, Text, Label } from "@primer/react";
import { BellIcon, CheckIcon } from "@primer/octicons-react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardLink, EmptyState } from "@/components/ui";
import { formatRelative } from "@/lib/format";
import { markRead, markAllRead } from "./actions";

interface NotificationRow {
  id: string;
  message: string;
  channel: string;
  read: boolean;
  createdAt: Date;
  incidentId: string;
  incidentNumber: number;
  incidentTitle: string;
}

const border = "1px solid var(--borderColor-default, #d0d7de)";

export function NotificationsView({
  notifications,
  hasUnread,
}: {
  notifications: NotificationRow[];
  hasUnread: boolean;
}) {
  return (
    <>
      <PageHeader
        title="Notifications"
        description="Simulated pages sent to you. No real emails or SMS are delivered."
        actions={
          hasUnread ? (
            <form action={markAllRead}>
              <Button type="submit" leadingVisual={CheckIcon}>
                Mark all as read
              </Button>
            </form>
          ) : undefined
        }
      />

      <Card>
        {notifications.length === 0 ? (
          <EmptyState title="No notifications" description="When you're paged, it'll show up here." icon={<BellIcon size={24} />} />
        ) : (
          notifications.map((n, idx) => (
            <div
              key={n.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 16px",
                borderTop: idx === 0 ? undefined : border,
                background: n.read ? undefined : "var(--bgColor-accent-muted, #ddf4ff)",
              }}
            >
              <span style={{ color: n.read ? "var(--fgColor-muted)" : "var(--fgColor-accent, #0969da)", display: "flex" }}>
                <BellIcon size={16} />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: n.read ? 400 : 600 }}>{n.message}</div>
                <Text size="small" style={{ color: "var(--fgColor-muted)" }}>
                  <CardLink href={`/incidents/${n.incidentId}`}>
                    <span style={{ color: "var(--fgColor-accent, #0969da)" }}>
                      #{n.incidentNumber} {n.incidentTitle}
                    </span>
                  </CardLink>{" "}
                  · {formatRelative(n.createdAt)}
                </Text>
              </div>
              {!n.read ? (
                <>
                  <Label variant="accent">New</Label>
                  <form action={markRead}>
                    <input type="hidden" name="id" value={n.id} />
                    <Button type="submit" size="small" variant="invisible" aria-label="Mark as read">
                      Mark read
                    </Button>
                  </form>
                </>
              ) : null}
            </div>
          ))
        )}
      </Card>
    </>
  );
}
