"use client";

import { Heading, Text } from "@primer/react";
import { AlertIcon, CalendarIcon, StackIcon, OrganizationIcon } from "@primer/octicons-react";
import { PageHeader } from "@/components/PageHeader";
import { Card, UserInline, EmptyState, CardLink, type InlineUser } from "@/components/ui";
import { IncidentStatusLabel, UrgencyLabel } from "@/components/StatusLabel";
import { formatRelative } from "@/lib/format";

export interface DashboardOnCall {
  id: string;
  name: string;
  teamName: string | null;
  user: InlineUser | null;
}

export interface DashboardIncident {
  id: string;
  number: number;
  title: string;
  status: string;
  urgency: string;
  serviceName: string;
  assignedUser: InlineUser | null;
  createdAt: Date;
}

export interface DashboardStats {
  services: number;
  schedules: number;
  teams: number;
  openIncidents: number;
}

const border = "1px solid var(--borderColor-default, #d0d7de)";

function Stat({ icon, label, value, href }: { icon: React.ReactNode; label: string; value: number; href: string }) {
  return (
    <CardLink href={href} style={{ flex: "1 1 160px" }}>
      <Card padded style={{ height: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--fgColor-muted, #656d76)", fontSize: 13 }}>
          {icon}
          {label}
        </div>
        <div style={{ fontSize: 28, fontWeight: 600, marginTop: 4 }}>{value}</div>
      </Card>
    </CardLink>
  );
}

export function DashboardView({
  onCall,
  openIncidents,
  stats,
}: {
  onCall: DashboardOnCall[];
  openIncidents: DashboardIncident[];
  stats: DashboardStats;
}) {
  return (
    <>
      <PageHeader title="Dashboard" description="Who's on call right now, and what's on fire." />

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
        <Stat icon={<AlertIcon />} label="Open incidents" value={stats.openIncidents} href="/incidents" />
        <Stat icon={<StackIcon />} label="Services" value={stats.services} href="/services" />
        <Stat icon={<CalendarIcon />} label="Schedules" value={stats.schedules} href="/schedules" />
        <Stat icon={<OrganizationIcon />} label="Teams" value={stats.teams} href="/teams" />
      </div>

      <Heading as="h2" variant="small" style={{ marginBottom: 8 }}>
        On call now
      </Heading>
      {onCall.length === 0 ? (
        <Card>
          <EmptyState title="No schedules yet" description="Create a schedule to start tracking on-call." />
        </Card>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12, marginBottom: 28 }}>
          {onCall.map((s) => (
            <CardLink key={s.id} href={`/schedules/${s.id}`}>
              <Card padded style={{ height: "100%" }}>
                <div style={{ fontWeight: 600, marginBottom: 2 }}>{s.name}</div>
                <Text size="small" style={{ color: "var(--fgColor-muted)" }}>{s.teamName ?? "No team"}</Text>
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: border }}>
                  <UserInline user={s.user} size={28} showLogin unassignedLabel="No one on call" />
                </div>
              </Card>
            </CardLink>
          ))}
        </div>
      )}

      <Heading as="h2" variant="small" style={{ marginBottom: 8 }}>
        Open incidents
      </Heading>
      <Card>
        {openIncidents.length === 0 ? (
          <EmptyState title="All clear" description="No triggered or acknowledged incidents." icon={<AlertIcon size={24} />} />
        ) : (
          openIncidents.map((inc, i) => (
            <CardLink key={inc.id} href={`/incidents/${inc.id}`} style={{ display: "block" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 16px",
                  borderTop: i === 0 ? undefined : border,
                }}
              >
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <IncidentStatusLabel status={inc.status} />
                  <UrgencyLabel urgency={inc.urgency} />
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    #{inc.number} {inc.title}
                  </div>
                  <Text size="small" style={{ color: "var(--fgColor-muted)" }}>{inc.serviceName}</Text>
                </div>
                <div style={{ flexShrink: 0 }}>
                  <UserInline user={inc.assignedUser} />
                </div>
                <Text size="small" style={{ color: "var(--fgColor-muted)", flexShrink: 0, width: 64, textAlign: "right" }}>
                  {formatRelative(inc.createdAt)}
                </Text>
              </div>
            </CardLink>
          ))
        )}
      </Card>
    </>
  );
}
