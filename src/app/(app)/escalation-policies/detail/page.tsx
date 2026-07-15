"use client";

import { useAsync } from "@/lib/useAsync";
import { useQueryId } from "@/lib/useQueryId";
import { getEscalationPolicy, type PdEscalationPolicy } from "@/lib/pdApi";
import { PageHeader } from "@/components/PageHeader";
import { Card, UserInline, EmptyState, Loading, ErrorState, CardLink } from "@/components/ui";
import { Button, Text } from "@primer/react";
import { LinkExternalIcon, ClockIcon } from "@primer/octicons-react";
import { formatDurationSeconds } from "@/lib/format";

export default function EscalationPolicyDetailPage() {
  const { id, ready } = useQueryId();
  if (!ready) return <Loading />;
  if (!id) return <ErrorState message="No escalation policy id was provided." />;
  return <PolicyDetail id={id} />;
}

function PolicyDetail({ id }: { id: string }) {
  const { data, loading, error, reload } = useAsync<PdEscalationPolicy>(() => getEscalationPolicy(id), [id]);

  if (loading) return <Loading label="Loading policy…" />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return <ErrorState message="Escalation policy not found." />;

  const rules = data.escalation_rules ?? [];

  return (
    <div>
      <PageHeader
        title={data.name}
        description={data.description || undefined}
        actions={
          data.html_url ? (
            <a href={data.html_url} target="_blank" rel="noreferrer">
              <Button leadingVisual={LinkExternalIcon}>Open in PagerDuty</Button>
            </a>
          ) : undefined
        }
      />

      {rules.length === 0 ? (
        <Card>
          <EmptyState title="No escalation levels" />
        </Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {rules.map((rule, idx) => (
            <Card key={rule.id} padded>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <span
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 999,
                    background: "var(--bgColor-accent-muted, #ddf4ff)",
                    color: "var(--fgColor-accent, #0969da)",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 13,
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {idx + 1}
                </span>
                <Text style={{ fontWeight: 600 }}>Level {idx + 1}</Text>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: 12,
                    color: "var(--fgColor-muted, #656d76)",
                  }}
                >
                  <ClockIcon size={12} /> escalates after {formatDurationSeconds(rule.escalation_delay_in_minutes * 60)}
                </span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, paddingLeft: 36 }}>
                {rule.targets.map((t) => {
                  const isSchedule = t.type.startsWith("schedule");
                  const label = t.summary || t.name || t.id;
                  return isSchedule ? (
                    <CardLink key={t.id} href={`/schedules/detail/?id=${t.id}`}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          border: "1px solid var(--borderColor-default, #d0d7de)",
                          borderRadius: 999,
                          padding: "3px 10px",
                          fontSize: 13,
                        }}
                      >
                        📅 {label}
                      </span>
                    </CardLink>
                  ) : (
                    <span
                      key={t.id}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        border: "1px solid var(--borderColor-default, #d0d7de)",
                        borderRadius: 999,
                        padding: "3px 10px",
                        fontSize: 13,
                      }}
                    >
                      <UserInline user={{ name: label }} size={18} />
                    </span>
                  );
                })}
              </div>
            </Card>
          ))}
          {data.num_loops ? (
            <Text style={{ fontSize: 13, color: "var(--fgColor-muted, #656d76)" }}>
              If still unacknowledged, this policy repeats {data.num_loops} time{data.num_loops === 1 ? "" : "s"}.
            </Text>
          ) : null}
        </div>
      )}
    </div>
  );
}
