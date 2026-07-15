"use client";

import { searchEscalationPolicies, type PdPage } from "@/lib/pdApi";
import { getStoredUser } from "@/lib/pdAuth";
import { ResourceBrowser, type BrowseRow } from "@/components/ResourceBrowser";
import { ListOrderedIcon } from "@primer/octicons-react";

export default function EscalationPoliciesPage() {
  async function fetchPage(query: string, offset: number): Promise<PdPage<BrowseRow>> {
    const me = getStoredUser();
    const page = await searchEscalationPolicies({ query, userIds: me ? [me.id] : undefined, offset });
    return {
      ...page,
      items: page.items.map((p) => {
        const levels = p.escalation_rules?.length ?? 0;
        return {
          id: p.id,
          title: p.name,
          subtitle: p.description,
          meta: `${levels} level${levels === 1 ? "" : "s"}`,
          href: `/escalation-policies/detail/?id=${p.id}`,
        };
      }),
    };
  }

  return (
    <ResourceBrowser
      title="Escalation policies"
      description="How incidents escalate when nobody responds."
      placeholder="Search all escalation policies by name…"
      icon={<ListOrderedIcon size={16} />}
      emptyIcon={<ListOrderedIcon size={24} />}
      fetchPage={fetchPage}
      emptyTitle="No escalation policies"
      emptyDescription="You're not on any escalation policies. Search to find any policy."
      defaultHint="Showing policies you're on. Search to find any policy."
    />
  );
}
