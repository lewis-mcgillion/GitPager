import { db } from "@/lib/db";
import { OPEN_INCIDENT_STATUSES } from "@/lib/domain";
import type { Prisma } from "@/generated/prisma";
import { IncidentsView, type IncidentFilter } from "./IncidentsView";

const VALID: IncidentFilter[] = ["open", "triggered", "acknowledged", "resolved", "all"];

function whereFor(filter: IncidentFilter): Prisma.IncidentWhereInput {
  if (filter === "open") return { status: { in: OPEN_INCIDENT_STATUSES } };
  if (filter === "all") return {};
  return { status: filter };
}

export default async function IncidentsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const filter: IncidentFilter = VALID.includes(status as IncidentFilter) ? (status as IncidentFilter) : "open";

  const [incidents, openCount, triggeredCount, ackCount, resolvedCount, allCount] = await Promise.all([
    db.incident.findMany({
      where: whereFor(filter),
      orderBy: { number: "desc" },
      take: 100,
      include: { service: true, assignedUser: true },
    }),
    db.incident.count({ where: { status: { in: OPEN_INCIDENT_STATUSES } } }),
    db.incident.count({ where: { status: "triggered" } }),
    db.incident.count({ where: { status: "acknowledged" } }),
    db.incident.count({ where: { status: "resolved" } }),
    db.incident.count(),
  ]);

  return (
    <IncidentsView
      filter={filter}
      counts={{ open: openCount, triggered: triggeredCount, acknowledged: ackCount, resolved: resolvedCount, all: allCount }}
      incidents={incidents.map((i) => ({
        id: i.id,
        number: i.number,
        title: i.title,
        status: i.status,
        urgency: i.urgency,
        serviceName: i.service.name,
        createdAt: i.createdAt,
        assignedUser: i.assignedUser
          ? { name: i.assignedUser.name, avatarUrl: i.assignedUser.avatarUrl, githubLogin: i.assignedUser.githubLogin }
          : null,
      }))}
    />
  );
}

export const dynamic = "force-dynamic";
