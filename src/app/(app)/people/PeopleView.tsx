"use client";

import { Avatar, Text, Label } from "@primer/react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardLink, avatarSrc } from "@/components/ui";

export interface Person {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  githubLogin: string | null;
  role: string;
  timeZone: string;
  teamCount: number;
  onCall: boolean;
}

const border = "1px solid var(--borderColor-default, #d0d7de)";

export function PeopleView({ people }: { people: Person[] }) {
  return (
    <>
      <PageHeader title="People" description="Everyone who can be put on call." />

      <Card>
        {people.map((p, idx) => (
          <CardLink key={p.id} href={`/people/${p.id}`}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderTop: idx === 0 ? undefined : border }}>
              <Avatar src={avatarSrc(p.avatarUrl)} alt="" size={36} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600 }}>
                  {p.name}
                  {p.githubLogin ? <span style={{ color: "var(--fgColor-muted)", fontWeight: 400 }}> @{p.githubLogin}</span> : null}
                </div>
                <Text size="small" style={{ color: "var(--fgColor-muted)" }}>
                  {p.email} · {p.timeZone}
                </Text>
              </div>
              {p.teamCount > 0 ? (
                <Text size="small" style={{ color: "var(--fgColor-muted)" }}>
                  {p.teamCount} team{p.teamCount === 1 ? "" : "s"}
                </Text>
              ) : null}
              {p.role === "admin" ? <Label variant="done">Admin</Label> : null}
              {p.onCall ? <Label variant="success">On call</Label> : null}
            </div>
          </CardLink>
        ))}
      </Card>
    </>
  );
}
