"use client";

import { searchTeams, type PdPage } from "@/lib/pdApi";
import { getStoredUser } from "@/lib/pdAuth";
import { ResourceBrowser, type BrowseRow } from "@/components/ResourceBrowser";
import { PeopleIcon } from "@primer/octicons-react";

export default function TeamsPage() {
  async function fetchPage(query: string, offset: number): Promise<PdPage<BrowseRow>> {
    // Default view: the teams you belong to (from your cached profile) — no API
    // call and no account-wide crawl. Typing runs a name search across all teams.
    if (!query) {
      const teams = (getStoredUser()?.teams ?? []).slice().sort((a, b) => a.name.localeCompare(b.name));
      return {
        items: teams.map((t) => ({ id: t.id, title: t.name, href: `/teams/detail/?id=${t.id}` })),
        more: false,
        offset: 0,
        limit: teams.length,
      };
    }
    const page = await searchTeams({ query, offset });
    return {
      ...page,
      items: page.items.map((t) => ({
        id: t.id,
        title: t.name,
        subtitle: t.description,
        href: `/teams/detail/?id=${t.id}`,
      })),
    };
  }

  return (
    <ResourceBrowser
      title="Teams"
      description="Groups that own services and schedules."
      placeholder="Search all teams by name…"
      icon={<PeopleIcon size={16} />}
      emptyIcon={<PeopleIcon size={24} />}
      fetchPage={fetchPage}
      emptyTitle="You're not on any teams"
      emptyDescription="Search to find any team in your account."
      defaultHint="Showing your teams. Search to find any team."
    />
  );
}
