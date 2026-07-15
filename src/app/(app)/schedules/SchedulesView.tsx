"use client";

import { Text } from "@primer/react";
import { CalendarIcon } from "@primer/octicons-react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardLink, UserInline, EmptyState, type InlineUser } from "@/components/ui";

export interface ScheduleListItem {
  id: string;
  name: string;
  teamName: string | null;
  description: string | null;
  layerCount: number;
  participantCount: number;
  onCall: InlineUser | null;
}

const border = "1px solid var(--borderColor-default, #d0d7de)";

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

export function SchedulesView({ schedules }: { schedules: ScheduleListItem[] }) {
  return (
    <>
      <PageHeader title="Schedules" description="On-call rotations and who's covering them right now." />

      {schedules.length === 0 ? (
        <Card>
          <EmptyState
            title="No schedules yet"
            description="Schedules define who is on call and when."
            icon={<CalendarIcon size={24} />}
          />
        </Card>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 12 }}>
          {schedules.map((s) => (
            <CardLink key={s.id} href={`/schedules/${s.id}`}>
              <Card padded style={{ height: "100%" }}>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{s.name}</div>
                <Text size="small" style={{ color: "var(--fgColor-muted)" }}>
                  {(s.teamName ?? "No team") + " · " + plural(s.layerCount, "layer") + " · " + plural(s.participantCount, "person").replace("persons", "people")}
                </Text>
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: border }}>
                  <div
                    style={{
                      fontSize: 11,
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                      color: "var(--fgColor-muted)",
                      marginBottom: 6,
                    }}
                  >
                    On call now
                  </div>
                  <UserInline user={s.onCall} size={28} showLogin unassignedLabel="No one on call" />
                </div>
              </Card>
            </CardLink>
          ))}
        </div>
      )}
    </>
  );
}
