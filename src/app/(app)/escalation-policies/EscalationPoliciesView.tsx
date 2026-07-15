"use client";

import { Text, Label } from "@primer/react";
import { IterationsIcon } from "@primer/octicons-react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardLink, EmptyState } from "@/components/ui";

export interface PolicyListItem {
  id: string;
  name: string;
  teamName: string | null;
  levelCount: number;
  serviceCount: number;
  firstLevel: string[];
}

const border = "1px solid var(--borderColor-default, #d0d7de)";

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

export function EscalationPoliciesView({ policies }: { policies: PolicyListItem[] }) {
  return (
    <>
      <PageHeader
        title="Escalation policies"
        description="Who gets notified, in what order, when an incident isn't acknowledged."
      />

      {policies.length === 0 ? (
        <Card>
          <EmptyState
            title="No escalation policies"
            description="Escalation policies route incidents to the right people."
            icon={<IterationsIcon size={24} />}
          />
        </Card>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 12 }}>
          {policies.map((p) => (
            <CardLink key={p.id} href={`/escalation-policies/${p.id}`}>
              <Card padded style={{ height: "100%" }}>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{p.name}</div>
                <Text size="small" style={{ color: "var(--fgColor-muted)" }}>
                  {(p.teamName ?? "No team") + " · " + plural(p.levelCount, "level") + " · used by " + plural(p.serviceCount, "service")}
                </Text>
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: border }}>
                  <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, color: "var(--fgColor-muted)", marginBottom: 6 }}>
                    First responders
                  </div>
                  {p.firstLevel.length > 0 ? (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {p.firstLevel.map((name, i) => (
                        <Label key={i} variant="accent">
                          {name}
                        </Label>
                      ))}
                    </div>
                  ) : (
                    <Text size="small" style={{ color: "var(--fgColor-muted)" }}>
                      No targets configured
                    </Text>
                  )}
                </div>
              </Card>
            </CardLink>
          ))}
        </div>
      )}
    </>
  );
}
