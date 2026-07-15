"use client";

import { Avatar, Heading, Text, Label } from "@primer/react";
import { StackIcon, CalendarIcon, WorkflowIcon } from "@primer/octicons-react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardLink, EmptyState, avatarSrc } from "@/components/ui";
import { ServiceStatusLabel } from "@/components/StatusLabel";

interface Member {
  id: string;
  role: string;
  name: string;
  avatarUrl: string | null;
  githubLogin: string | null;
}

const border = "1px solid var(--borderColor-default, #d0d7de)";

function LinkList({
  items,
  hrefBase,
  icon,
  empty,
  renderRight,
}: {
  items: { id: string; name: string }[];
  hrefBase: string;
  icon: React.ReactNode;
  empty: string;
  renderRight?: (id: string) => React.ReactNode;
}) {
  if (items.length === 0) {
    return (
      <Card>
        <EmptyState title={empty} />
      </Card>
    );
  }
  return (
    <Card>
      {items.map((it, idx) => (
        <CardLink key={it.id} href={`${hrefBase}/${it.id}`}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderTop: idx === 0 ? undefined : border }}>
            <span style={{ color: "var(--fgColor-muted)", display: "flex" }}>{icon}</span>
            <span style={{ flex: 1, fontWeight: 500 }}>{it.name}</span>
            {renderRight ? renderRight(it.id) : null}
          </div>
        </CardLink>
      ))}
    </Card>
  );
}

export function TeamDetailView({
  name,
  slug,
  description,
  members,
  services,
  schedules,
  policies,
}: {
  name: string;
  slug: string;
  description: string | null;
  members: Member[];
  services: { id: string; name: string; status: string }[];
  schedules: { id: string; name: string }[];
  policies: { id: string; name: string }[];
}) {
  const serviceStatus = new Map(services.map((s) => [s.id, s.status]));

  return (
    <>
      <PageHeader title={name} description={description ?? `@${slug}`} />

      <Heading as="h2" variant="small" style={{ marginBottom: 8 }}>
        Members
      </Heading>
      <Card padded style={{ marginBottom: 24 }}>
        {members.length === 0 ? (
          <Text style={{ color: "var(--fgColor-muted)" }}>No members.</Text>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
            {members.map((m) => (
              <CardLink key={m.id} href={`/people/${m.id}`}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Avatar src={avatarSrc(m.avatarUrl)} alt="" size={32} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.name}</div>
                    <div style={{ fontSize: 12, color: "var(--fgColor-muted)" }}>
                      {m.role === "manager" ? <Label variant="accent">Manager</Label> : `@${m.githubLogin ?? "member"}`}
                    </div>
                  </div>
                </div>
              </CardLink>
            ))}
          </div>
        )}
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24 }}>
        <div>
          <Heading as="h2" variant="small" style={{ marginBottom: 8 }}>
            Services
          </Heading>
          <LinkList
            items={services}
            hrefBase="/services"
            icon={<StackIcon size={16} />}
            empty="No services"
            renderRight={(id) => <ServiceStatusLabel status={serviceStatus.get(id) ?? "active"} />}
          />
        </div>
        <div>
          <Heading as="h2" variant="small" style={{ marginBottom: 8 }}>
            Schedules
          </Heading>
          <LinkList items={schedules} hrefBase="/schedules" icon={<CalendarIcon size={16} />} empty="No schedules" />
        </div>
        <div>
          <Heading as="h2" variant="small" style={{ marginBottom: 8 }}>
            Escalation policies
          </Heading>
          <LinkList items={policies} hrefBase="/escalation-policies" icon={<WorkflowIcon size={16} />} empty="No policies" />
        </div>
      </div>
    </>
  );
}
