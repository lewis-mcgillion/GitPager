"use client";

import { Text } from "@primer/react";
import { StackIcon, AlertIcon } from "@primer/octicons-react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardLink, EmptyState } from "@/components/ui";
import { ServiceStatusLabel } from "@/components/StatusLabel";

export interface ServiceListItem {
  id: string;
  name: string;
  description: string | null;
  status: string;
  teamName: string | null;
  policyName: string | null;
  openIncidents: number;
}

const border = "1px solid var(--borderColor-default, #d0d7de)";

export function ServicesView({ services }: { services: ServiceListItem[] }) {
  return (
    <>
      <PageHeader title="Services" description="Systems that can page. Each routes incidents through an escalation policy." />

      {services.length === 0 ? (
        <Card>
          <EmptyState title="No services" description="Services represent the systems you support." icon={<StackIcon size={24} />} />
        </Card>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 12 }}>
          {services.map((s) => (
            <CardLink key={s.id} href={`/services/${s.id}`}>
              <Card padded style={{ height: "100%" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{s.name}</div>
                  <ServiceStatusLabel status={s.status} />
                </div>
                {s.description ? (
                  <Text size="small" style={{ color: "var(--fgColor-muted)", display: "block", marginTop: 4 }}>
                    {s.description}
                  </Text>
                ) : null}
                <div
                  style={{
                    marginTop: 12,
                    paddingTop: 12,
                    borderTop: border,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                  }}
                >
                  <Text size="small" style={{ color: "var(--fgColor-muted)" }}>
                    {(s.teamName ?? "No team") + " · " + (s.policyName ?? "No policy")}
                  </Text>
                  {s.openIncidents > 0 ? (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "var(--fgColor-danger, #cf222e)", fontSize: 13, fontWeight: 600 }}>
                      <AlertIcon size={14} /> {s.openIncidents}
                    </span>
                  ) : (
                    <Text size="small" style={{ color: "var(--fgColor-success, #1a7f37)" }}>
                      Healthy
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
