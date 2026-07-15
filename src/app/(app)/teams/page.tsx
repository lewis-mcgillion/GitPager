"use client";

import { useAsync } from "@/lib/useAsync";
import { listTeams, type PdTeam } from "@/lib/pdApi";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardRow, EmptyState, Loading, ErrorState, CardLink } from "@/components/ui";
import { Text } from "@primer/react";
import { PeopleIcon } from "@primer/octicons-react";

export default function TeamsPage() {
  const { data, loading, error, reload } = useAsync<PdTeam[]>(() => listTeams(), []);

  return (
    <div>
      <PageHeader title="Teams" description="Groups that own services and schedules." />

      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : (data?.length ?? 0) === 0 ? (
        <Card>
          <EmptyState icon={<PeopleIcon size={24} />} title="No teams" />
        </Card>
      ) : (
        <Card>
          {data!.map((t, i) => (
            <CardRow key={t.id} style={i === 0 ? { borderTop: "none" } : undefined}>
              <span style={{ color: "var(--fgColor-muted, #656d76)", flexShrink: 0 }}>
                <PeopleIcon size={16} />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <CardLink href={`/teams/detail/?id=${t.id}`}>
                  <Text style={{ fontWeight: 500 }}>{t.name}</Text>
                </CardLink>
                {t.description ? (
                  <div style={{ fontSize: 12, color: "var(--fgColor-muted, #656d76)" }}>{t.description}</div>
                ) : null}
              </div>
            </CardRow>
          ))}
        </Card>
      )}
    </div>
  );
}
