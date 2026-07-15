"use client";

import { useAsync } from "@/lib/useAsync";
import { useQueryId } from "@/lib/useQueryId";
import { getUser, listOnCalls, type PdUser, type PdOnCall } from "@/lib/pdApi";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardRow, EmptyState, Loading, ErrorState, CardLink } from "@/components/ui";
import { Avatar, Button, Text } from "@primer/react";
import { LinkExternalIcon } from "@primer/octicons-react";
import { avatarSrc } from "@/components/ui";
import { formatRelative } from "@/lib/format";

interface PersonData {
  user: PdUser;
  oncalls: PdOnCall[];
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 12, color: "var(--fgColor-muted, #656d76)", marginBottom: 2 }}>{label}</div>
      <div>{children}</div>
    </div>
  );
}

export default function PersonDetailPage() {
  const { id, ready } = useQueryId();
  if (!ready) return <Loading />;
  if (!id) return <ErrorState message="No user id was provided." />;
  return <PersonDetail id={id} />;
}

function PersonDetail({ id }: { id: string }) {
  const { data, loading, error, reload } = useAsync<PersonData>(async () => {
    const [user, oncalls] = await Promise.all([
      getUser(id),
      listOnCalls({ "user_ids[]": [id] }),
    ]);
    return { user, oncalls };
  }, [id]);

  if (loading) return <Loading label="Loading profile…" />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return <ErrorState message="User not found." />;

  const { user, oncalls } = data;

  // De-duplicate on-call rows down to distinct schedules.
  const schedules = new Map<string, PdOnCall>();
  for (const o of oncalls) {
    if (o.schedule) schedules.set(o.schedule.id, o);
  }
  const scheduleOnCalls = Array.from(schedules.values());

  return (
    <div>
      <PageHeader
        title={user.name}
        actions={
          user.html_url ? (
            <a href={user.html_url} target="_blank" rel="noreferrer">
              <Button leadingVisual={LinkExternalIcon}>Open in PagerDuty</Button>
            </a>
          ) : undefined
        }
      />

      <Card padded style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 16 }}>
          <Avatar src={avatarSrc(user.avatar_url)} size={64} />
          <div>
            <div style={{ fontWeight: 600, fontSize: 18 }}>{user.name}</div>
            <div style={{ color: "var(--fgColor-muted, #656d76)" }}>{user.email}</div>
          </div>
        </div>
        <Field label="Role">{user.job_title || user.role || "—"}</Field>
        <Field label="Time zone">{user.time_zone || "—"}</Field>
        <Field label="Teams">
          {user.teams && user.teams.length > 0 ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {user.teams.map((t) => (
                <CardLink key={t.id} href={`/teams/detail/?id=${t.id}`}>
                  <span
                    style={{
                      border: "1px solid var(--borderColor-default, #d0d7de)",
                      borderRadius: 999,
                      padding: "2px 10px",
                      fontSize: 13,
                    }}
                  >
                    {t.summary}
                  </span>
                </CardLink>
              ))}
            </div>
          ) : (
            "—"
          )}
        </Field>
      </Card>

      <h2 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 12px" }}>Currently on call</h2>
      {scheduleOnCalls.length === 0 ? (
        <Card>
          <EmptyState title="Not on call" description={`${user.name} isn't on call right now.`} />
        </Card>
      ) : (
        <Card>
          {scheduleOnCalls.map((o, i) => (
            <CardRow key={o.schedule!.id} style={i === 0 ? { borderTop: "none" } : undefined}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <CardLink href={`/schedules/detail/?id=${o.schedule!.id}`}>
                  <Text style={{ fontWeight: 500 }}>{o.schedule!.summary}</Text>
                </CardLink>
                {o.escalation_policy ? (
                  <div style={{ fontSize: 12, color: "var(--fgColor-muted, #656d76)" }}>{o.escalation_policy.summary}</div>
                ) : null}
              </div>
              <div style={{ flexShrink: 0, fontSize: 12, color: "var(--fgColor-muted, #656d76)" }}>
                {o.end ? `until ${formatRelative(o.end)}` : "ongoing"}
              </div>
            </CardRow>
          ))}
        </Card>
      )}
    </div>
  );
}
