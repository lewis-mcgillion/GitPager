"use client";

import { Avatar, Text } from "@primer/react";
import { OrganizationIcon } from "@primer/octicons-react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardLink, EmptyState, avatarSrc, type InlineUser } from "@/components/ui";

export interface TeamListItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  memberCount: number;
  serviceCount: number;
  scheduleCount: number;
  members: InlineUser[];
}

const border = "1px solid var(--borderColor-default, #d0d7de)";

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

export function TeamsView({ teams }: { teams: TeamListItem[] }) {
  return (
    <>
      <PageHeader title="Teams" description="Groups of people who own services, schedules and escalation policies." />

      {teams.length === 0 ? (
        <Card>
          <EmptyState title="No teams" description="Teams organise who owns what." icon={<OrganizationIcon size={24} />} />
        </Card>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 12 }}>
          {teams.map((t) => (
            <CardLink key={t.id} href={`/teams/${t.id}`}>
              <Card padded style={{ height: "100%" }}>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{t.name}</div>
                <Text size="small" style={{ color: "var(--fgColor-muted)" }}>
                  {t.description ?? `@${t.slug}`}
                </Text>
                <div style={{ display: "flex", marginTop: 12 }}>
                  {t.members.slice(0, 8).map((m, i) => (
                    <Avatar
                      key={i}
                      src={avatarSrc(m.avatarUrl)}
                      alt={m.name}
                      title={m.name}
                      size={26}
                      style={{ marginLeft: i === 0 ? 0 : -6, border: "2px solid var(--bgColor-default, #fff)" }}
                    />
                  ))}
                </div>
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: border }}>
                  <Text size="small" style={{ color: "var(--fgColor-muted)" }}>
                    {plural(t.memberCount, "member") + " · " + plural(t.serviceCount, "service") + " · " + plural(t.scheduleCount, "schedule")}
                  </Text>
                </div>
              </Card>
            </CardLink>
          ))}
        </div>
      )}
    </>
  );
}
