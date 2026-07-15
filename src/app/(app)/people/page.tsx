"use client";

import { useAsync } from "@/lib/useAsync";
import { listUsers, type PdUser } from "@/lib/pdApi";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardRow, UserInline, EmptyState, Loading, ErrorState, CardLink } from "@/components/ui";
import { PersonIcon } from "@primer/octicons-react";

export default function PeoplePage() {
  const { data, loading, error, reload } = useAsync<PdUser[]>(() => listUsers(), []);

  return (
    <div>
      <PageHeader title="People" description="Everyone in your PagerDuty account." />

      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : (data?.length ?? 0) === 0 ? (
        <Card>
          <EmptyState icon={<PersonIcon size={24} />} title="No people" />
        </Card>
      ) : (
        <Card>
          {data!.map((u, i) => (
            <CardRow key={u.id} style={i === 0 ? { borderTop: "none" } : undefined}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <CardLink href={`/people/detail/?id=${u.id}`}>
                  <UserInline user={{ name: u.name, avatarUrl: u.avatar_url }} />
                </CardLink>
                <div style={{ fontSize: 12, color: "var(--fgColor-muted, #656d76)", marginLeft: 28 }}>{u.email}</div>
              </div>
              <div style={{ flexShrink: 0, fontSize: 12, color: "var(--fgColor-muted, #656d76)" }}>
                {u.job_title || u.role || ""}
              </div>
            </CardRow>
          ))}
        </Card>
      )}
    </div>
  );
}
