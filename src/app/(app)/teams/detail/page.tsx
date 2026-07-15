"use client";

import { useAsync } from "@/lib/useAsync";
import { useQueryId } from "@/lib/useQueryId";
import { getTeam, listUsers, type PdTeam, type PdUser } from "@/lib/pdApi";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardRow, UserInline, EmptyState, Loading, ErrorState, CardLink } from "@/components/ui";
import { Button, Text } from "@primer/react";
import { LinkExternalIcon } from "@primer/octicons-react";

interface TeamData {
  team: PdTeam;
  members: PdUser[];
}

export default function TeamDetailPage() {
  const { id, ready } = useQueryId();
  if (!ready) return <Loading />;
  if (!id) return <ErrorState message="No team id was provided." />;
  return <TeamDetail id={id} />;
}

function TeamDetail({ id }: { id: string }) {
  const { data, loading, error, reload } = useAsync<TeamData>(async () => {
    const [team, allUsers] = await Promise.all([getTeam(id), listUsers()]);
    const members = allUsers.filter((u) => (u.teams ?? []).some((t) => t.id === id));
    return { team, members };
  }, [id]);

  if (loading) return <Loading label="Loading team…" />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return <ErrorState message="Team not found." />;

  const { team, members } = data;

  return (
    <div>
      <PageHeader
        title={team.name}
        description={team.description || undefined}
        actions={
          team.html_url ? (
            <a href={team.html_url} target="_blank" rel="noreferrer">
              <Button leadingVisual={LinkExternalIcon}>Open in PagerDuty</Button>
            </a>
          ) : undefined
        }
      />

      <h2 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 12px" }}>
        Members {members.length > 0 ? <Text style={{ color: "var(--fgColor-muted)", fontWeight: 400 }}>({members.length})</Text> : null}
      </h2>
      {members.length === 0 ? (
        <Card>
          <EmptyState title="No members" description="No users list this team in their membership." />
        </Card>
      ) : (
        <Card>
          {members.map((u, i) => (
            <CardRow key={u.id} style={i === 0 ? { borderTop: "none" } : undefined}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <CardLink href={`/people/detail/?id=${u.id}`}>
                  <UserInline user={{ name: u.name, avatarUrl: u.avatar_url }} />
                </CardLink>
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
