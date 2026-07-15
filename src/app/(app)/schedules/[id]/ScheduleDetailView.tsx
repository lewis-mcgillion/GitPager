"use client";

import { useEffect, useRef } from "react";
import { Avatar, Button, Heading, Text, Label } from "@primer/react";
import { PlusIcon, TrashIcon, PersonIcon } from "@primer/octicons-react";
import { PageHeader } from "@/components/PageHeader";
import { Card, UserInline, EmptyState, avatarSrc, type InlineUser } from "@/components/ui";
import { OnCallTimeline, type TimelineSegment } from "@/components/OnCallTimeline";
import { formatDateTime } from "@/lib/format";
import { createOverride, deleteOverride } from "../actions";

interface LayerVM {
  id: string;
  name: string;
  rotationLabel: string;
  handoffTime: string;
  participants: InlineUser[];
}

interface OverrideVM {
  id: string;
  user: InlineUser;
  start: Date;
  end: Date;
  active: boolean;
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
const fieldLabel: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
  fontSize: 12,
  color: "var(--fgColor-muted)",
};

function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function ScheduleDetailView({
  scheduleId,
  name,
  teamName,
  description,
  timeZone,
  onCall,
  onCallUntil,
  segments,
  from,
  to,
  layers,
  overrides,
  users,
  defaultUserId,
}: {
  scheduleId: string;
  name: string;
  teamName: string | null;
  description: string | null;
  timeZone: string;
  onCall: InlineUser | null;
  onCallUntil: Date | null;
  segments: TimelineSegment[];
  from: Date;
  to: Date;
  layers: LayerVM[];
  overrides: OverrideVM[];
  users: { id: string; name: string }[];
  defaultUserId: string;
}) {
  const startRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLInputElement>(null);

  // Pre-fill the override window (now → +8h) after mount. Done by writing to the
  // inputs via refs (DOM sync) rather than state, to avoid an SSR/client
  // hydration mismatch on the time-dependent default values.
  useEffect(() => {
    const now = new Date();
    if (startRef.current) startRef.current.value = toLocalInput(now);
    if (endRef.current) endRef.current.value = toLocalInput(new Date(now.getTime() + 8 * 3600 * 1000));
  }, []);

  return (
    <>
      <PageHeader
        title={name}
        description={description ?? undefined}
        actions={<Label variant="secondary">{teamName ?? "No team"}</Label>}
      />

      {/* On call now hero */}
      <Card padded style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 240 }}>
          <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5, color: "var(--fgColor-muted)", marginBottom: 8 }}>
            On call now
          </div>
          {onCall ? (
            <UserInline user={onCall} size={40} showLogin />
          ) : (
            <Text style={{ color: "var(--fgColor-muted)" }}>No one is on call.</Text>
          )}
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 12, color: "var(--fgColor-muted)" }}>Hands off</div>
          <div style={{ fontWeight: 600 }}>{onCallUntil ? formatDateTime(onCallUntil) : "—"}</div>
          <div style={{ fontSize: 12, color: "var(--fgColor-muted)", marginTop: 2 }}>{timeZone}</div>
        </div>
      </Card>

      {/* Timeline */}
      <Heading as="h2" variant="small" style={{ marginBottom: 8 }}>
        Next 14 days
      </Heading>
      <Card padded style={{ marginBottom: 24 }}>
        <OnCallTimeline segments={segments} from={from} to={to} now={from} />
      </Card>

      {/* Layers */}
      <Heading as="h2" variant="small" style={{ marginBottom: 8 }}>
        Rotation layers
      </Heading>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
        {layers.length === 0 ? (
          <Card>
            <EmptyState title="No layers" description="This schedule has no rotation layers." />
          </Card>
        ) : (
          layers.map((l) => (
            <Card key={l.id} padded>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                <div style={{ fontWeight: 600 }}>{l.name}</div>
                <Text size="small" style={{ color: "var(--fgColor-muted)" }}>
                  Rotates every {l.rotationLabel} · hand-off {l.handoffTime}
                </Text>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
                {l.participants.map((p, i) => (
                  <div
                    key={i}
                    style={{ display: "flex", alignItems: "center", gap: 6, border, borderRadius: 999, padding: "3px 10px 3px 4px" }}
                  >
                    <span style={{ fontSize: 11, color: "var(--fgColor-muted)", width: 16, textAlign: "center" }}>{i + 1}</span>
                    <Avatar src={avatarSrc(p.avatarUrl)} alt="" size={20} />
                    <span style={{ fontSize: 13 }}>{p.name}</span>
                  </div>
                ))}
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Overrides */}
      <Heading as="h2" variant="small" style={{ marginBottom: 8 }}>
        Overrides
      </Heading>
      <Card style={{ marginBottom: 16 }}>
        {overrides.length === 0 ? (
          <EmptyState title="No active or upcoming overrides" description="Add one below to cover for someone." icon={<PersonIcon size={24} />} />
        ) : (
          overrides.map((o, i) => (
            <div
              key={o.id}
              style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderTop: i === 0 ? undefined : border }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <UserInline user={o.user} showLogin />
              </div>
              <Text size="small" style={{ color: "var(--fgColor-muted)" }}>
                {formatDateTime(o.start)} → {formatDateTime(o.end)}
              </Text>
              {o.active ? <Label variant="success">Active</Label> : <Label variant="secondary">Upcoming</Label>}
              <form action={deleteOverride}>
                <input type="hidden" name="id" value={o.id} />
                <input type="hidden" name="scheduleId" value={scheduleId} />
                <Button type="submit" variant="invisible" size="small" leadingVisual={TrashIcon} aria-label="Remove override">
                  Remove
                </Button>
              </form>
            </div>
          ))
        )}
      </Card>

      {/* Add override */}
      <Card padded>
        <div style={{ fontWeight: 600, marginBottom: 12 }}>Add an override</div>
        <form action={createOverride} style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end" }}>
          <input type="hidden" name="scheduleId" value={scheduleId} />
          <label style={fieldLabel}>
            Who
            <select name="userId" defaultValue={defaultUserId} style={inputStyle}>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </label>
          <label style={fieldLabel}>
            From
            <input type="datetime-local" name="start" required ref={startRef} style={inputStyle} />
          </label>
          <label style={fieldLabel}>
            Until
            <input type="datetime-local" name="end" required ref={endRef} style={inputStyle} />
          </label>
          <Button type="submit" variant="primary" leadingVisual={PlusIcon}>
            Add override
          </Button>
        </form>
      </Card>
    </>
  );
}
