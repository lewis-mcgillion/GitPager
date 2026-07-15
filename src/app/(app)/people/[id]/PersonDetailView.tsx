"use client";

import { Avatar, Heading, Text, Label } from "@primer/react";
import { CalendarIcon, OrganizationIcon } from "@primer/octicons-react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardLink, EmptyState, avatarSrc } from "@/components/ui";
import { IncidentStatusLabel, UrgencyLabel } from "@/components/StatusLabel";

const border = "1px solid var(--borderColor-default, #d0d7de)";

export function PersonDetailView({
  name,
  email,
  avatarUrl,
  githubLogin,
  role,
  timeZone,
  onCallScheduleNames,
  teams,
  schedules,
  openIncidents,
}: {
  name: string;
  email: string;
  avatarUrl: string | null;
  githubLogin: string | null;
  role: string;
  timeZone: string;
  onCallScheduleNames: string[];
  teams: { id: string; name: string; role: string }[];
  schedules: { id: string; name: string }[];
  openIncidents: { id: string; number: number; title: string; status: string; urgency: string; serviceName: string }[];
}) {
  return (
    <>
      <PageHeader title={name} description={githubLogin ? `@${githubLogin}` : undefined} />

      {/* Profile */}
      <Card padded style={{ marginBottom: 24, display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
        <Avatar src={avatarSrc(avatarUrl)} alt="" size={56} />
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 600, fontSize: 16 }}>{name}</span>
            {role === "admin" ? <Label variant="done">Admin</Label> : null}
            {onCallScheduleNames.length > 0 ? <Label variant="success">On call now</Label> : null}
          </div>
          <Text size="small" style={{ color: "var(--fgColor-muted)", display: "block", marginTop: 2 }}>
            {email} · {timeZone}
          </Text>
          {onCallScheduleNames.length > 0 ? (
            <Text size="small" style={{ color: "var(--fgColor-muted)", display: "block", marginTop: 4 }}>
              Covering: {onCallScheduleNames.join(", ")}
            </Text>
          ) : null}
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24, marginBottom: 24 }}>
        <div>
          <Heading as="h2" variant="small" style={{ marginBottom: 8 }}>
            Teams
          </Heading>
          {teams.length === 0 ? (
            <Card>
              <EmptyState title="No teams" />
            </Card>
          ) : (
            <Card>
              {teams.map((t, idx) => (
                <CardLink key={t.id} href={`/teams/${t.id}`}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderTop: idx === 0 ? undefined : border }}>
                    <span style={{ color: "var(--fgColor-muted)", display: "flex" }}>
                      <OrganizationIcon size={16} />
                    </span>
                    <span style={{ flex: 1, fontWeight: 500 }}>{t.name}</span>
                    {t.role === "manager" ? <Label variant="accent">Manager</Label> : null}
                  </div>
                </CardLink>
              ))}
            </Card>
          )}
        </div>

        <div>
          <Heading as="h2" variant="small" style={{ marginBottom: 8 }}>
            Schedules
          </Heading>
          {schedules.length === 0 ? (
            <Card>
              <EmptyState title="Not in any rotation" />
            </Card>
          ) : (
            <Card>
              {schedules.map((s, idx) => (
                <CardLink key={s.id} href={`/schedules/${s.id}`}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderTop: idx === 0 ? undefined : border }}>
                    <span style={{ color: "var(--fgColor-muted)", display: "flex" }}>
                      <CalendarIcon size={16} />
                    </span>
                    <span style={{ flex: 1, fontWeight: 500 }}>{s.name}</span>
                  </div>
                </CardLink>
              ))}
            </Card>
          )}
        </div>
      </div>

      <Heading as="h2" variant="small" style={{ marginBottom: 8 }}>
        Open incidents assigned
      </Heading>
      <Card>
        {openIncidents.length === 0 ? (
          <EmptyState title="No open incidents" description="This person has nothing assigned right now." />
        ) : (
          openIncidents.map((i, idx) => (
            <CardLink key={i.id} href={`/incidents/${i.id}`}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderTop: idx === 0 ? undefined : border }}>
                <span style={{ color: "var(--fgColor-muted)", fontVariantNumeric: "tabular-nums", fontSize: 13 }}>#{i.number}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{i.title}</div>
                  <Text size="small" style={{ color: "var(--fgColor-muted)" }}>
                    {i.serviceName}
                  </Text>
                </div>
                <UrgencyLabel urgency={i.urgency} />
                <IncidentStatusLabel status={i.status} />
              </div>
            </CardLink>
          ))
        )}
      </Card>
    </>
  );
}
