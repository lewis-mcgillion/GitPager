"use client";

import { useState } from "react";
import { SegmentedControl, Text } from "@primer/react";
import { AlertIcon } from "@primer/octicons-react";
import { useAsync } from "@/lib/useAsync";
import { listIncidents, type PdIncident } from "@/lib/pdApi";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardRow, UserInline, EmptyState, Loading, ErrorState, CardLink } from "@/components/ui";
import { IncidentStatusLabel, UrgencyLabel } from "@/components/StatusLabel";
import { formatRelative } from "@/lib/format";

type Filter = "open" | "triggered" | "acknowledged" | "resolved" | "all";

const FILTERS: { key: Filter; label: string; statuses: string[] }[] = [
  { key: "open", label: "Open", statuses: ["triggered", "acknowledged"] },
  { key: "triggered", label: "Triggered", statuses: ["triggered"] },
  { key: "acknowledged", label: "Acknowledged", statuses: ["acknowledged"] },
  { key: "resolved", label: "Resolved", statuses: ["resolved"] },
  { key: "all", label: "All", statuses: ["triggered", "acknowledged", "resolved"] },
];

export default function IncidentsPage() {
  const [filter, setFilter] = useState<Filter>("open");
  const statuses = FILTERS.find((f) => f.key === filter)!.statuses;

  const { data, loading, error, reload } = useAsync<PdIncident[]>(
    () => listIncidents({ "statuses[]": statuses, limit: 50 }),
    [filter],
  );

  return (
    <div>
      <PageHeader title="Incidents" description="Triggered, acknowledged and resolved incidents." />

      <div style={{ marginBottom: 16 }}>
        <SegmentedControl aria-label="Incident status filter">
          {FILTERS.map((f) => (
            <SegmentedControl.Button key={f.key} selected={filter === f.key} onClick={() => setFilter(f.key)}>
              {f.label}
            </SegmentedControl.Button>
          ))}
        </SegmentedControl>
      </div>

      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : (data?.length ?? 0) === 0 ? (
        <Card>
          <EmptyState icon={<AlertIcon size={24} />} title="No incidents" description="Nothing matches this filter." />
        </Card>
      ) : (
        <Card>
          {data!.map((inc, i) => {
            const assignee = inc.assignments?.[0]?.assignee;
            return (
              <CardRow key={inc.id} style={i === 0 ? { borderTop: "none" } : undefined}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <CardLink href={`/incidents/detail/?id=${inc.id}`}>
                    <Text style={{ fontWeight: 500 }}>
                      #{inc.incident_number} {inc.title}
                    </Text>
                  </CardLink>
                  <div style={{ fontSize: 12, color: "var(--fgColor-muted, #656d76)" }}>
                    {inc.service?.summary ?? "Unknown service"} · {formatRelative(inc.created_at)}
                  </div>
                </div>
                {assignee ? (
                  <div style={{ flexShrink: 0, minWidth: 0, maxWidth: 180 }}>
                    <UserInline user={{ name: assignee.summary || assignee.name || "Unknown" }} size={18} />
                  </div>
                ) : null}
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
                  <UrgencyLabel urgency={inc.urgency} />
                  <IncidentStatusLabel status={inc.status} />
                </div>
              </CardRow>
            );
          })}
        </Card>
      )}
    </div>
  );
}
