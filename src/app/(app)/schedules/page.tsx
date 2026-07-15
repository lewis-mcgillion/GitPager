"use client";

import { useAsync } from "@/lib/useAsync";
import { listMySchedules, type PdRef } from "@/lib/pdApi";
import { getStoredUser } from "@/lib/pdAuth";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardRow, EmptyState, Loading, ErrorState, CardLink } from "@/components/ui";
import { Text } from "@primer/react";
import { CalendarIcon } from "@primer/octicons-react";

export default function SchedulesPage() {
  const { data, loading, error, reload } = useAsync<PdRef[]>(() => {
    const me = getStoredUser();
    return me ? listMySchedules(me.id) : Promise.resolve([]);
  }, []);

  return (
    <div>
      <PageHeader title="Schedules" description="The on-call rotations you're part of." />

      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : (data?.length ?? 0) === 0 ? (
        <Card>
          <EmptyState
            icon={<CalendarIcon size={24} />}
            title="No schedules"
            description="You're not on any on-call schedules in the next 90 days."
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
                  <Text style={{ fontWeight: 500 }}>{s.summary}</Text>
                </CardLink>
              </div>
            </CardRow>
          ))}
        </Card>
      )}
    </div>
  );
}
