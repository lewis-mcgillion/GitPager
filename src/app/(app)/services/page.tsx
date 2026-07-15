"use client";

import { useAsync } from "@/lib/useAsync";
import { listServices, type PdService } from "@/lib/pdApi";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardRow, EmptyState, Loading, ErrorState, CardLink } from "@/components/ui";
import { ServiceStatusLabel } from "@/components/StatusLabel";
import { Text } from "@primer/react";
import { ServerIcon } from "@primer/octicons-react";

export default function ServicesPage() {
  const { data, loading, error, reload } = useAsync<PdService[]>(() => listServices(), []);

  return (
    <div>
      <PageHeader title="Services" description="The systems you page for." />

      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : (data?.length ?? 0) === 0 ? (
        <Card>
          <EmptyState icon={<ServerIcon size={24} />} title="No services" />
        </Card>
      ) : (
        <Card>
          {data!.map((s, i) => (
            <CardRow key={s.id} style={i === 0 ? { borderTop: "none" } : undefined}>
              <span style={{ color: "var(--fgColor-muted, #656d76)", flexShrink: 0 }}>
                <ServerIcon size={16} />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <CardLink href={`/services/detail/?id=${s.id}`}>
                  <Text style={{ fontWeight: 500 }}>{s.name}</Text>
                </CardLink>
                {s.description ? (
                  <div style={{ fontSize: 12, color: "var(--fgColor-muted, #656d76)" }}>{s.description}</div>
                ) : null}
              </div>
              {s.status ? <ServiceStatusLabel status={s.status} /> : null}
            </CardRow>
          ))}
        </Card>
      )}
    </div>
  );
}
