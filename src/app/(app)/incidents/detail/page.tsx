"use client";

import { useState } from "react";
import { Button, Text, Flash } from "@primer/react";
import { LinkExternalIcon, CheckIcon, BellIcon } from "@primer/octicons-react";
import { useAsync } from "@/lib/useAsync";
import { useQueryId } from "@/lib/useQueryId";
import {
  getIncident,
  listIncidentLogEntries,
  manageIncident,
  type PdIncident,
  type PdLogEntry,
} from "@/lib/pdApi";
import { getStoredUser } from "@/lib/pdAuth";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardRow, UserInline, EmptyState, Loading, ErrorState, CardLink } from "@/components/ui";
import { IncidentStatusLabel, UrgencyLabel } from "@/components/StatusLabel";
import { formatDateTime, formatRelative } from "@/lib/format";

interface IncidentData {
  incident: PdIncident;
  log: PdLogEntry[];
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 12, color: "var(--fgColor-muted, #656d76)", marginBottom: 2 }}>{label}</div>
      <div>{children}</div>
    </div>
  );
}

export default function IncidentDetailPage() {
  const { id, ready } = useQueryId();
  if (!ready) return <Loading />;
  if (!id) return <ErrorState message="No incident id was provided." />;
  return <IncidentDetail id={id} />;
}

function IncidentDetail({ id }: { id: string }) {
  const { data, loading, error, reload } = useAsync<IncidentData>(async () => {
    const [incident, log] = await Promise.all([getIncident(id), listIncidentLogEntries(id)]);
    return { incident, log };
  }, [id]);

  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const email = getStoredUser()?.email;

  async function act(status: "acknowledged" | "resolved") {
    if (!email) {
      setActionError("We couldn't determine your email, which PagerDuty requires to act on an incident.");
      return;
    }
    setActionError(null);
    setBusy(true);
    try {
      await manageIncident(id, status, email);
      reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <Loading label="Loading incident…" />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return <ErrorState message="Incident not found." />;

  const { incident, log } = data;
  const assignee = incident.assignments?.[0]?.assignee;
  const canAck = incident.status === "triggered";
  const canResolve = incident.status !== "resolved";

  return (
    <div>
      <PageHeader
        title={`#${incident.incident_number} ${incident.title}`}
        actions={
          <div style={{ display: "flex", gap: 8 }}>
            {canAck ? (
              <Button leadingVisual={BellIcon} disabled={busy} onClick={() => act("acknowledged")}>
                Acknowledge
              </Button>
            ) : null}
            {canResolve ? (
              <Button variant="primary" leadingVisual={CheckIcon} disabled={busy} onClick={() => act("resolved")}>
                Resolve
              </Button>
            ) : null}
            {incident.html_url ? (
              <a href={incident.html_url} target="_blank" rel="noreferrer">
                <Button leadingVisual={LinkExternalIcon}>Open in PagerDuty</Button>
              </a>
            ) : null}
          </div>
        }
      />

      {actionError ? (
        <Flash variant="danger" style={{ marginBottom: 16 }}>
          {actionError}
        </Flash>
      ) : null}

      <Card padded style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <IncidentStatusLabel status={incident.status} />
          <UrgencyLabel urgency={incident.urgency} />
        </div>
        <Field label="Service">
          {incident.service ? (
            <CardLink href={`/services/detail/?id=${incident.service.id}`}>
              <Text style={{ color: "var(--fgColor-accent, #0969da)" }}>{incident.service.summary}</Text>
            </CardLink>
          ) : (
            "—"
          )}
        </Field>
        <Field label="Assigned to">
          {assignee ? <UserInline user={{ name: assignee.summary || assignee.name || "Unknown" }} /> : "Unassigned"}
        </Field>
        <Field label="Created">{formatDateTime(incident.created_at)} ({formatRelative(incident.created_at)})</Field>
        {incident.description && incident.description !== incident.title ? (
          <Field label="Description">{incident.description}</Field>
        ) : null}
      </Card>

      <h2 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 12px" }}>Timeline</h2>
      {log.length === 0 ? (
        <Card>
          <EmptyState title="No timeline entries" />
        </Card>
      ) : (
        <Card>
          {log.map((entry, i) => (
            <CardRow key={entry.id} style={i === 0 ? { borderTop: "none", alignItems: "flex-start" } : { alignItems: "flex-start" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ fontSize: 14 }}>{entry.summary || entry.type.replace(/_log_entry$/, "")}</Text>
                {entry.agent?.summary ? (
                  <div style={{ fontSize: 12, color: "var(--fgColor-muted, #656d76)" }}>by {entry.agent.summary}</div>
                ) : null}
              </div>
              <div style={{ flexShrink: 0, fontSize: 12, color: "var(--fgColor-muted, #656d76)" }}>
                {formatDateTime(entry.created_at)}
              </div>
            </CardRow>
          ))}
        </Card>
      )}
    </div>
  );
}
