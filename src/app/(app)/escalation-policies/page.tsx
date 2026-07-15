"use client";

import { useAsync } from "@/lib/useAsync";
import { listEscalationPolicies, type PdEscalationPolicy } from "@/lib/pdApi";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardRow, EmptyState, Loading, ErrorState, CardLink } from "@/components/ui";
import { Text } from "@primer/react";
import { ListOrderedIcon } from "@primer/octicons-react";

export default function EscalationPoliciesPage() {
  const { data, loading, error, reload } = useAsync<PdEscalationPolicy[]>(
    () => listEscalationPolicies(),
    [],
  );

  return (
    <div>
      <PageHeader title="Escalation policies" description="How incidents escalate when nobody responds." />

      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : (data?.length ?? 0) === 0 ? (
        <Card>
          <EmptyState icon={<ListOrderedIcon size={24} />} title="No escalation policies" />
        </Card>
      ) : (
        <Card>
          {data!.map((p, i) => (
            <CardRow key={p.id} style={i === 0 ? { borderTop: "none" } : undefined}>
              <span style={{ color: "var(--fgColor-muted, #656d76)", flexShrink: 0 }}>
                <ListOrderedIcon size={16} />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <CardLink href={`/escalation-policies/detail/?id=${p.id}`}>
                  <Text style={{ fontWeight: 500 }}>{p.name}</Text>
                </CardLink>
                {p.description ? (
                  <div style={{ fontSize: 12, color: "var(--fgColor-muted, #656d76)" }}>{p.description}</div>
                ) : null}
              </div>
              <div style={{ flexShrink: 0, fontSize: 12, color: "var(--fgColor-muted, #656d76)" }}>
                {(p.escalation_rules?.length ?? 0)} level{(p.escalation_rules?.length ?? 0) === 1 ? "" : "s"}
              </div>
            </CardRow>
          ))}
        </Card>
      )}
    </div>
  );
}
