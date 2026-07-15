"use client";

import { useAsync } from "@/lib/useAsync";
import { listSchedules, type PdSchedule } from "@/lib/pdApi";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardRow, EmptyState, Loading, ErrorState, CardLink } from "@/components/ui";
import { Text } from "@primer/react";
import { CalendarIcon } from "@primer/octicons-react";

export default function SchedulesPage() {
  const { data, loading, error, reload } = useAsync<PdSchedule[]>(() => listSchedules(), []);

  return (
    <div>
      <PageHeader title="Schedules" description="On-call rotations across your teams." />

      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : (data?.length ?? 0) === 0 ? (
        <Card>
          <EmptyState
            icon={<CalendarIcon size={24} />}
            title="No schedules"
            description="No on-call schedules were found for your account."
          />
        </Card>
      ) : (
        <Card>
          {data!.map((s, i) => (
            <CardRow key={s.id} style={i === 0 ? { borderTop: "none" } : undefined}>
              <span style={{ color: "var(--fgColor-muted, #656d76)", flexShrink: 0 }}>
                <CalendarIcon size={16} />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <CardLink href={`/schedules/detail/?id=${s.id}`}>
                  <Text style={{ fontWeight: 500 }}>{s.name}</Text>
                </CardLink>
                {s.description ? (
                  <div style={{ fontSize: 12, color: "var(--fgColor-muted, #656d76)" }}>{s.description}</div>
                ) : null}
              </div>
              <div style={{ flexShrink: 0, fontSize: 12, color: "var(--fgColor-muted, #656d76)" }}>
                {s.time_zone ?? ""}
              </div>
            </CardRow>
          ))}
        </Card>
      )}
    </div>
  );
}
