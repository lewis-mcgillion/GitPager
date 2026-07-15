"use client";

import { Avatar } from "@primer/react";
import { PersonIcon } from "@primer/octicons-react";
import { searchUsers, type PdPage } from "@/lib/pdApi";
import { getStoredUser } from "@/lib/pdAuth";
import { ResourceBrowser, type BrowseRow } from "@/components/ResourceBrowser";
import { avatarSrc } from "@/components/ui";

export default function PeoplePage() {
  async function fetchPage(query: string, offset: number): Promise<PdPage<BrowseRow>> {
    // Default view: your teammates (people on your teams). Typing searches all
    // people in the account.
    const teamIds = getStoredUser()?.teams?.map((t) => t.id) ?? [];
    const page = await searchUsers({ query, teamIds, offset });
    return {
      ...page,
      items: page.items.map((u) => ({
        id: u.id,
        title: u.name,
        subtitle: u.email,
        meta: u.job_title || u.role || "",
        href: `/people/detail/?id=${u.id}`,
        leading: <Avatar src={avatarSrc(u.avatar_url)} size={20} />,
      })),
    };
  }

  return (
    <ResourceBrowser
      title="People"
      description="People in your PagerDuty account."
      placeholder="Search all people by name…"
      icon={<PersonIcon size={16} />}
      emptyIcon={<PersonIcon size={24} />}
      fetchPage={fetchPage}
      emptyTitle="No people"
      emptyDescription="No teammates found. Search to find anyone in your account."
      defaultHint="Showing your teammates. Search to find anyone."
    />
  );
}
