"use client";

import Link from "next/link";
import { Text, CounterLabel } from "@primer/react";
import { CheckCircleIcon } from "@primer/octicons-react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardLink, UserInline, EmptyState, type InlineUser } from "@/components/ui";
import { IncidentStatusLabel, UrgencyLabel } from "@/components/StatusLabel";
import { formatRelative } from "@/lib/format";

export type IncidentFilter = "open" | "triggered" | "acknowledged" | "resolved" | "all";

interface IncidentRow {
  id: string;
  number: number;
  title: string;
  status: string;
  urgency: string;
  serviceName: string;
  createdAt: Date;
  assignedUser: InlineUser | null;
}

const border = "1px solid var(--borderColor-default, #d0d7de)";

const TABS: { key: IncidentFilter; label: string }[] = [
  { key: "open", label: "Open" },
  { key: "triggered", label: "Triggered" },
  { key: "acknowledged", label: "Acknowledged" },
  { key: "resolved", label: "Resolved" },
  { key: "all", label: "All" },
];

export function IncidentsView({
  filter,
  counts,
  incidents,
}: {
  filter: IncidentFilter;
  counts: Record<IncidentFilter, number>;
  incidents: IncidentRow[];
}) {
  return (
    <>
      <PageHeader title="Incidents" description="Everything that's paged, is being worked, or has been resolved." />

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 4, borderBottom: border, marginBottom: 16, flexWrap: "wrap" }}>
        {TABS.map((t) => {
          const active = t.key === filter;
          return (
            <Link
              key={t.key}
              href={`/incidents?status=${t.key}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 12px",
                color: active ? "var(--fgColor-default)" : "var(--fgColor-muted)",
                fontWeight: active ? 600 : 400,
                textDecoration: "none",
                borderBottom: active ? "2px solid var(--borderColor-accent-emphasis, #fd8c73)" : "2px solid transparent",
                marginBottom: -1,
              }}
            >
              {t.label}
              <CounterLabel>{counts[t.key]}</CounterLabel>
            </Link>
          );
        })}
      </div>

      <Card>
        {incidents.length === 0 ? (
          <EmptyState
            title="Nothing here"
            description={filter === "open" ? "No open incidents — all clear." : "No incidents match this filter."}
            icon={<CheckCircleIcon size={24} />}
          />
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
                <span style={{ color: "var(--fgColor-muted)", fontVariantNumeric: "tabular-nums", fontSize: 13, width: 40 }}>
                  #{i.number}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{i.title}</div>
                  <Text size="small" style={{ color: "var(--fgColor-muted)" }}>
                    {i.serviceName} · {formatRelative(i.createdAt)}
                  </Text>
                </div>
                <UrgencyLabel urgency={i.urgency} />
                <IncidentStatusLabel status={i.status} />
                <div style={{ width: 150, textAlign: "right" }}>
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
