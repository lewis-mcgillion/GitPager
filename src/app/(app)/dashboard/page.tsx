"use client";

import Link from "next/link";
import { useAsync } from "@/lib/useAsync";
import { listOnCalls, listIncidents, type PdOnCall, type PdIncident } from "@/lib/pdApi";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardRow, UserInline, EmptyState, Loading, ErrorState, CardLink } from "@/components/ui";
import { IncidentStatusLabel, UrgencyLabel } from "@/components/StatusLabel";
import { formatRelative } from "@/lib/format";
import { Text } from "@primer/react";
import { AlertIcon, CalendarIcon } from "@primer/octicons-react";

interface DashboardData {
  oncalls: PdOnCall[];
  incidents: PdIncident[];
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{ fontSize: 16, fontWeight: 600, margin: "28px 0 12px" }}>{children}</h2>
  );
}

export default function DashboardPage() {
  const { data, loading, error, reload } = useAsync<DashboardData>(async () => {
    const [oncalls, incidents] = await Promise.all([
      listOnCalls(),
      listIncidents({ "statuses[]": ["triggered", "acknowledged"] }),
    ]);
    return { oncalls, incidents };
  }, []);

  // Keep the lowest escalation level per schedule/policy — that's who is
  // actually on call right now — and drop duplicate rows PagerDuty returns.
  const oncalls = (data?.oncalls ?? [])
    .slice()
    .sort((a, b) => (a.escalation_level ?? 99) - (b.escalation_level ?? 99));
  const seen = new Set<string>();
  const primaryOnCall = oncalls.filter((o) => {
    const key = `${o.schedule?.id ?? "none"}:${o.escalation_policy?.id ?? "none"}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return (
    <div>
      <PageHeader title="Dashboard" description="Who's on call right now, and what's on fire." />

      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : (
        <>
          <SectionTitle>On call now</SectionTitle>
          {primaryOnCall.length === 0 ? (
            <Card>
              <EmptyState
                icon={<CalendarIcon size={24} />}
                title="Nobody is on call"
                description="No active on-call entries were returned for your account."
              />
            </Card>
          ) : (
            <Card>
              {primaryOnCall.map((o, i) => (
                <CardRow key={`${o.schedule?.id ?? "x"}-${o.escalation_policy?.id ?? "x"}-${i}`} style={i === 0 ? { borderTop: "none" } : undefined}>
                  <div style={{ flex: "0 0 220px", minWidth: 0 }}>
                    <UserInline user={{ name: o.user.summary || o.user.name || "Unknown" }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {o.schedule ? (
                      <CardLink href={`/schedules/detail/?id=${o.schedule.id}`}>
                        <Text style={{ fontWeight: 500 }}>{o.schedule.summary}</Text>
                      </CardLink>
                    ) : (
                      <Text style={{ color: "var(--fgColor-muted)" }}>Direct assignment</Text>
                    )}
                    {o.escalation_policy ? (
                      <div style={{ fontSize: 12, color: "var(--fgColor-muted, #656d76)" }}>
                        {o.escalation_policy.summary} · level {o.escalation_level ?? 1}
                      </div>
                    ) : null}
                  </div>
                  <div style={{ flexShrink: 0, fontSize: 12, color: "var(--fgColor-muted, #656d76)" }}>
                    {o.end ? `until ${formatRelative(o.end)}` : "ongoing"}
                  </div>
                </CardRow>
              ))}
            </Card>
          )}

          <SectionTitle>Open incidents</SectionTitle>
          {(data?.incidents.length ?? 0) === 0 ? (
            <Card>
              <EmptyState
                icon={<AlertIcon size={24} />}
                title="All clear"
                description="No triggered or acknowledged incidents right now."
              />
            </Card>
          ) : (
            <Card>
              {data!.incidents.map((inc, i) => (
                <CardRow key={inc.id} style={i === 0 ? { borderTop: "none" } : undefined}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <CardLink href={`/incidents/detail/?id=${inc.id}`}>
                      <Text style={{ fontWeight: 500 }}>
                        #{inc.incident_number} {inc.title}
                      </Text>
                    </CardLink>
                    <div style={{ fontSize: 12, color: "var(--fgColor-muted, #656d76)" }}>
                      {inc.service?.summary ?? "Unknown service"} · triggered {formatRelative(inc.created_at)}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
                    <UrgencyLabel urgency={inc.urgency} />
                    <IncidentStatusLabel status={inc.status} />
                  </div>
                </CardRow>
              ))}
              <CardRow>
                <Link href="/incidents/" style={{ fontSize: 13 }}>
                  View all incidents →
                </Link>
              </CardRow>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
