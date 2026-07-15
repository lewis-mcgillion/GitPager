"use client";

import { useState } from "react";
import { Button, Heading, Text, Label } from "@primer/react";
import { CopyIcon, CheckIcon, LinkExternalIcon } from "@primer/octicons-react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardLink, UserInline, EmptyState, type InlineUser } from "@/components/ui";
import { ServiceStatusLabel, IncidentStatusLabel, UrgencyLabel } from "@/components/StatusLabel";
import { SERVICE_STATUSES } from "@/lib/domain";
import { formatDateTime } from "@/lib/format";
import { updateServiceStatus } from "../actions";

interface IncidentRow {
  id: string;
  number: number;
  title: string;
  status: string;
  urgency: string;
  createdAt: Date;
  assignedUser: InlineUser | null;
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

function IntegrationKey({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      <code
        style={{
          fontFamily: "var(--fontStack-monospace, ui-monospace, monospace)",
          fontSize: 13,
          background: "var(--bgColor-muted, #f6f8fa)",
          border,
          borderRadius: 6,
          padding: "4px 8px",
        }}
      >
        {value}
      </code>
      <Button
        size="small"
        leadingVisual={copied ? CheckIcon : CopyIcon}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          } catch {
            /* clipboard unavailable */
          }
        }}
      >
        {copied ? "Copied" : "Copy"}
      </Button>
    </div>
  );
}

export function ServiceDetailView({
  serviceId,
  name,
  description,
  status,
  teamName,
  integrationKey,
  policy,
  incidents,
  canEdit,
}: {
  serviceId: string;
  name: string;
  description: string | null;
  status: string;
  teamName: string | null;
  integrationKey: string;
  policy: { id: string; name: string } | null;
  incidents: IncidentRow[];
  canEdit: boolean;
}) {
  return (
    <>
      <PageHeader
        title={name}
        description={description ?? undefined}
        actions={
          <>
            <ServiceStatusLabel status={status} />
            {teamName ? <Label variant="secondary">{teamName}</Label> : null}
          </>
        }
      />

      {/* Config card */}
      <Card padded style={{ marginBottom: 24, display: "grid", gap: 16 }}>
        <div>
          <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5, color: "var(--fgColor-muted)", marginBottom: 6 }}>
            Integration key
          </div>
          <IntegrationKey value={integrationKey} />
          <Text size="small" style={{ color: "var(--fgColor-muted)", display: "block", marginTop: 6 }}>
            Send events to <code>POST /api/events</code> with this <code>routing_key</code> to trigger incidents.
          </Text>
        </div>

        <div>
          <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5, color: "var(--fgColor-muted)", marginBottom: 6 }}>
            Escalation policy
          </div>
          {policy ? (
            <CardLink href={`/escalation-policies/${policy.id}`}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "var(--fgColor-accent, #0969da)" }}>
                {policy.name} <LinkExternalIcon size={12} />
              </span>
            </CardLink>
          ) : (
            <Text size="small" style={{ color: "var(--fgColor-muted)" }}>
              No escalation policy attached
            </Text>
          )}
        </div>

        {canEdit ? (
          <div>
            <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5, color: "var(--fgColor-muted)", marginBottom: 6 }}>
              Status
            </div>
            <form action={updateServiceStatus} style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input type="hidden" name="id" value={serviceId} />
              <select name="status" defaultValue={status} style={inputStyle}>
                {SERVICE_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s[0].toUpperCase() + s.slice(1)}
                  </option>
                ))}
              </select>
              <Button type="submit" size="small">
                Update
              </Button>
            </form>
          </div>
        ) : null}
      </Card>

      <Heading as="h2" variant="small" style={{ marginBottom: 8 }}>
        Recent incidents
      </Heading>
      <Card>
        {incidents.length === 0 ? (
          <EmptyState title="No incidents" description="This service has no incidents yet." />
        ) : (
          incidents.map((i, idx) => (
            <CardLink key={i.id} href={`/incidents/${i.id}`}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 16px",
                  borderTop: idx === 0 ? undefined : border,
                }}
              >
                <span style={{ color: "var(--fgColor-muted)", fontVariantNumeric: "tabular-nums", fontSize: 13 }}>#{i.number}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{i.title}</div>
                  <Text size="small" style={{ color: "var(--fgColor-muted)" }}>
                    {formatDateTime(i.createdAt)}
                  </Text>
                </div>
                <UrgencyLabel urgency={i.urgency} />
                <IncidentStatusLabel status={i.status} />
                <div style={{ width: 140, textAlign: "right" }}>
                  <UserInline user={i.assignedUser} unassignedLabel="Unassigned" />
                </div>
              </div>
            </CardLink>
          ))
        )}
      </Card>
    </>
  );
}
