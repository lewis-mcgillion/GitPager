"use client";

import { Button, Heading, Text } from "@primer/react";
import {
  AlertIcon,
  EyeIcon,
  CheckCircleIcon,
  ArrowUpIcon,
  BellIcon,
  PersonIcon,
  CommentIcon,
  type Icon,
} from "@primer/octicons-react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardLink, UserInline, type InlineUser } from "@/components/ui";
import { IncidentStatusLabel, UrgencyLabel } from "@/components/StatusLabel";
import { formatDateTime, formatRelative } from "@/lib/format";
import { acknowledgeAction, resolveAction, reassignAction, escalateAction } from "../actions";

interface TimelineEntry {
  id: string;
  type: string;
  message: string;
  actorName: string | null;
  createdAt: Date;
}

const border = "1px solid var(--borderColor-default, #d0d7de)";
const inputStyle: React.CSSProperties = {
  padding: "5px 8px",
  border,
  borderRadius: 6,
  background: "var(--bgColor-default, #fff)",
  color: "inherit",
  font: "inherit",
  fontSize: 13,
};

const TYPE_ICON: Record<string, { icon: Icon; color: string }> = {
  triggered: { icon: AlertIcon, color: "var(--fgColor-danger, #cf222e)" },
  acknowledged: { icon: EyeIcon, color: "var(--fgColor-attention, #9a6700)" },
  resolved: { icon: CheckCircleIcon, color: "var(--fgColor-success, #1a7f37)" },
  escalated: { icon: ArrowUpIcon, color: "var(--fgColor-danger, #cf222e)" },
  notified: { icon: BellIcon, color: "var(--fgColor-muted, #656d76)" },
  reassigned: { icon: PersonIcon, color: "var(--fgColor-muted, #656d76)" },
  annotated: { icon: CommentIcon, color: "var(--fgColor-muted, #656d76)" },
};

function MetaItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ minWidth: 120 }}>
      <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, color: "var(--fgColor-muted)", marginBottom: 4 }}>
        {label}
      </div>
      <div>{children}</div>
    </div>
  );
}

export function IncidentDetailView({
  incidentId,
  number,
  title,
  description,
  status,
  urgency,
  currentLevel,
  createdAt,
  resolvedAt,
  service,
  policy,
  assignedUser,
  timeline,
  users,
  assignedUserId,
  canEdit,
}: {
  incidentId: string;
  number: number;
  title: string;
  description: string | null;
  status: string;
  urgency: string;
  currentLevel: number;
  createdAt: Date;
  resolvedAt: Date | null;
  service: { id: string; name: string };
  policy: { id: string; name: string } | null;
  assignedUser: InlineUser | null;
  timeline: TimelineEntry[];
  users: { id: string; name: string }[];
  assignedUserId: string | null;
  canEdit: boolean;
}) {
  const resolved = status === "resolved";

  return (
    <>
      <PageHeader
        title={title}
        description={`#${number} · ${service.name}`}
        actions={
          <>
            <UrgencyLabel urgency={urgency} />
            <IncidentStatusLabel status={status} />
          </>
        }
      />

      {description ? (
        <Card padded style={{ marginBottom: 16 }}>
          <Text style={{ whiteSpace: "pre-wrap" }}>{description}</Text>
        </Card>
      ) : null}

      {/* Meta */}
      <Card padded style={{ marginBottom: 16, display: "flex", gap: 24, flexWrap: "wrap" }}>
        <MetaItem label="Service">
          <CardLink href={`/services/${service.id}`}>
            <span style={{ color: "var(--fgColor-accent, #0969da)" }}>{service.name}</span>
          </CardLink>
        </MetaItem>
        <MetaItem label="Assigned to">
          <UserInline user={assignedUser} unassignedLabel="Unassigned" />
        </MetaItem>
        <MetaItem label="Escalation">
          {policy ? (
            <CardLink href={`/escalation-policies/${policy.id}`}>
              <span style={{ color: "var(--fgColor-accent, #0969da)" }}>
                {policy.name} · L{currentLevel + 1}
              </span>
            </CardLink>
          ) : (
            <Text size="small" style={{ color: "var(--fgColor-muted)" }}>None</Text>
          )}
        </MetaItem>
        <MetaItem label="Triggered">
          <span title={formatDateTime(createdAt)}>{formatRelative(createdAt)}</span>
        </MetaItem>
        {resolvedAt ? (
          <MetaItem label="Resolved">
            <span title={formatDateTime(resolvedAt)}>{formatRelative(resolvedAt)}</span>
          </MetaItem>
        ) : null}
      </Card>

      {/* Actions */}
      {canEdit && !resolved ? (
        <Card padded style={{ marginBottom: 24, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          {status === "triggered" ? (
            <form action={acknowledgeAction}>
              <input type="hidden" name="id" value={incidentId} />
              <Button type="submit" leadingVisual={EyeIcon}>
                Acknowledge
              </Button>
            </form>
          ) : null}
          <form action={resolveAction}>
            <input type="hidden" name="id" value={incidentId} />
            <Button type="submit" variant="primary" leadingVisual={CheckCircleIcon}>
              Resolve
            </Button>
          </form>
          <form action={escalateAction}>
            <input type="hidden" name="id" value={incidentId} />
            <Button type="submit" leadingVisual={ArrowUpIcon}>
              Escalate
            </Button>
          </form>
          <form action={reassignAction} style={{ display: "flex", gap: 6, alignItems: "center", marginLeft: "auto" }}>
            <input type="hidden" name="id" value={incidentId} />
            <select name="userId" defaultValue={assignedUserId ?? ""} style={inputStyle} aria-label="Reassign to">
              <option value="" disabled>
                Reassign to…
              </option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
            <Button type="submit" leadingVisual={PersonIcon}>
              Reassign
            </Button>
          </form>
        </Card>
      ) : null}

      {/* Timeline */}
      <Heading as="h2" variant="small" style={{ marginBottom: 12 }}>
        Timeline
      </Heading>
      <div style={{ position: "relative", paddingLeft: 8 }}>
        {timeline.map((e, idx) => {
          const meta = TYPE_ICON[e.type] ?? { icon: CommentIcon, color: "var(--fgColor-muted, #656d76)" };
          const IconCmp = meta.icon;
          return (
            <div key={e.id} style={{ display: "flex", gap: 12, position: "relative", paddingBottom: idx === timeline.length - 1 ? 0 : 20 }}>
              {/* connector line */}
              {idx !== timeline.length - 1 ? (
                <div style={{ position: "absolute", left: 15, top: 32, bottom: 0, width: 2, background: "var(--borderColor-muted, #d8dee4)" }} />
              ) : null}
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: "var(--bgColor-muted, #f6f8fa)",
                  border,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: meta.color,
                  flexShrink: 0,
                  zIndex: 1,
                }}
              >
                <IconCmp size={16} />
              </div>
              <div style={{ paddingTop: 6 }}>
                <div style={{ fontSize: 14 }}>
                  {e.message}
                  {e.actorName ? <span style={{ color: "var(--fgColor-muted)" }}> · by {e.actorName}</span> : null}
                </div>
                <Text size="small" style={{ color: "var(--fgColor-muted)" }} title={formatDateTime(e.createdAt)}>
                  {formatRelative(e.createdAt)}
                </Text>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
