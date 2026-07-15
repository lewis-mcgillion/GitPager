"use client";

import { searchServices, type PdPage } from "@/lib/pdApi";
import { getStoredUser } from "@/lib/pdAuth";
import { ResourceBrowser, type BrowseRow } from "@/components/ResourceBrowser";
import { ServiceStatusLabel } from "@/components/StatusLabel";
import { ServerIcon } from "@primer/octicons-react";

export default function ServicesPage() {
  async function fetchPage(query: string, offset: number): Promise<PdPage<BrowseRow>> {
    // Default view: services owned by your teams. Typing searches all services.
    const teamIds = getStoredUser()?.teams?.map((t) => t.id) ?? [];
    const page = await searchServices({ query, teamIds, offset });
    return {
      ...page,
      items: page.items.map((s) => ({
        id: s.id,
        title: s.name,
        subtitle: s.description,
        meta: s.status ? <ServiceStatusLabel status={s.status} /> : null,
        href: `/services/detail/?id=${s.id}`,
      })),
    };
  }

  return (
    <ResourceBrowser
      title="Services"
      description="The systems you page for."
      placeholder="Search all services by name…"
      icon={<ServerIcon size={16} />}
      emptyIcon={<ServerIcon size={24} />}
      fetchPage={fetchPage}
      emptyTitle="No services"
      emptyDescription="No services owned by your teams. Search to find any service."
      defaultHint="Showing services owned by your teams. Search to find any service."
    />
  );
}
