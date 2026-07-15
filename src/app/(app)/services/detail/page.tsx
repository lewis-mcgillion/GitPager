"use client";

import { useAsync } from "@/lib/useAsync";
import { useQueryId } from "@/lib/useQueryId";
import { getService, listIncidents, type PdService, type PdIncident } from "@/lib/pdApi";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardRow, EmptyState, Loading, ErrorState, CardLink } from "@/components/ui";
import { ServiceStatusLabel, IncidentStatusLabel, UrgencyLabel } from "@/components/StatusLabel";
import { Button, Text } from "@primer/react";
import { LinkExternalIcon } from "@primer/octicons-react";
import { formatRelative } from "@/lib/format";

interface ServiceData {
  service: PdService;
  incidents: PdIncident[];
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 12, color: "var(--fgColor-muted, #656d76)", marginBottom: 2 }}>{label}</div>
      <div>{children}</div>
    </div>
  );
}

export default function ServiceDetailPage() {
  const { id, ready } = useQueryId();
  if (!ready) return <Loading />;
  if (!id) return <ErrorState message="No service id was provided." />;
  return <ServiceDetail id={id} />;
}

function ServiceDetail({ id }: { id: string }) {
  const { data, loading, error, reload } = useAsync<ServiceData>(async () => {
    const [service, incidents] = await Promise.all([
      getService(id),
      listIncidents({ "service_ids[]": [id], "statuses[]": ["triggered", "acknowledged", "resolved"], limit: 10 }),
    ]);
    return { service, incidents };
  }, [id]);

  if (loading) return <Loading label="Loading service…" />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return <ErrorState message="Service not found." />;

  const { service, incidents } = data;

  return (
    <div>
      <PageHeader
        title={service.name}
        description={service.description || undefined}
        actions={
          service.html_url ? (
            <a href={service.html_url} target="_blank" rel="noreferrer">
              <Button leadingVisual={LinkExternalIcon}>Open in PagerDuty</Button>
            </a>
          ) : undefined
        }
      />

      <Card padded style={{ marginBottom: 20 }}>
        <Field label="Status">{service.status ? <ServiceStatusLabel status={service.status} /> : "—"}</Field>
        <Field label="Escalation policy">
          {service.escalation_policy ? (
            <CardLink href={`/escalation-policies/detail/?id=${service.escalation_policy.id}`}>
              <Text style={{ color: "var(--fgColor-accent, #0969da)" }}>{service.escalation_policy.summary}</Text>
            </CardLink>
          ) : (
            "—"
          )}
        </Field>
        <Field label="Teams">
          {service.teams && service.teams.length > 0
            ? service.teams.map((t) => t.summary).join(", ")
            : "—"}
        </Field>
      </Card>

      <h2 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 12px" }}>Recent incidents</h2>
      {incidents.length === 0 ? (
        <Card>
          <EmptyState title="No recent incidents" description="This service has been quiet." />
        </Card>
      ) : (
        <Card>
          {incidents.map((inc, i) => (
            <CardRow key={inc.id} style={i === 0 ? { borderTop: "none" } : undefined}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <CardLink href={`/incidents/detail/?id=${inc.id}`}>
                  <Text style={{ fontWeight: 500 }}>
                    #{inc.incident_number} {inc.title}
                  </Text>
                </CardLink>
                <div style={{ fontSize: 12, color: "var(--fgColor-muted, #656d76)" }}>
                  {formatRelative(inc.created_at)}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
                <UrgencyLabel urgency={inc.urgency} />
                <IncidentStatusLabel status={inc.status} />
              </div>
            </CardRow>
          ))}
        </Card>
      )}
    </div>
  );
}
