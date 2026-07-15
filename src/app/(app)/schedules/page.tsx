"use client";

import { listMySchedules, searchSchedules, type PdPage } from "@/lib/pdApi";
import { getStoredUser } from "@/lib/pdAuth";
import { ResourceBrowser, type BrowseRow } from "@/components/ResourceBrowser";
import { CalendarIcon } from "@primer/octicons-react";

export default function SchedulesPage() {
  async function fetchPage(query: string, offset: number): Promise<PdPage<BrowseRow>> {
    // Default view: the schedules you're actually on over the next 90 days
    // (derived from your on-call entries). Typing searches all schedules.
    if (!query) {
      const me = getStoredUser();
      const mine = me ? await listMySchedules(me.id) : [];
      return {
        items: mine.map((s) => ({ id: s.id, title: s.summary ?? "Schedule", href: `/schedules/detail/?id=${s.id}` })),
        more: false,
        offset: 0,
        limit: mine.length,
      };
    }
    const page = await searchSchedules({ query, offset });
    return {
      ...page,
      items: page.items.map((s) => ({
        id: s.id,
        title: s.name,
        subtitle: s.description,
        href: `/schedules/detail/?id=${s.id}`,
      })),
    };
  }

  return (
    <ResourceBrowser
      title="Schedules"
      description="On-call rotations."
      placeholder="Search all schedules by name…"
      icon={<CalendarIcon size={16} />}
      emptyIcon={<CalendarIcon size={24} />}
      fetchPage={fetchPage}
      emptyTitle="No schedules"
      emptyDescription="You're not on any on-call schedules in the next 90 days. Search to find any schedule."
      defaultHint="Showing schedules you're on in the next 90 days. Search to find any schedule."
    />
  );
}
