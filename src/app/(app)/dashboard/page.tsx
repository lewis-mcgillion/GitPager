import { db } from "@/lib/db";
import { getOnCallNow } from "@/lib/schedules";
import { OPEN_INCIDENT_STATUSES } from "@/lib/domain";
import { DashboardView } from "./DashboardView";

export default async function DashboardPage() {
  const [onCall, openIncidents, services, schedules, teams] = await Promise.all([
    getOnCallNow(),
    db.incident.findMany({
      where: { status: { in: OPEN_INCIDENT_STATUSES } },
      include: { service: true, assignedUser: true },
      orderBy: [{ status: "asc" }, { urgency: "asc" }, { createdAt: "desc" }],
    }),
    db.service.count(),
    db.schedule.count(),
    db.team.count(),
  ]);

  return (
    <DashboardView
      onCall={onCall.map((o) => ({
        id: o.schedule.id,
        name: o.schedule.name,
        teamName: o.schedule.team?.name ?? null,
        user: o.user,
      }))}
      openIncidents={openIncidents.map((i) => ({
        id: i.id,
        number: i.number,
        title: i.title,
        status: i.status,
        urgency: i.urgency,
        serviceName: i.service.name,
        assignedUser: i.assignedUser
          ? { name: i.assignedUser.name, avatarUrl: i.assignedUser.avatarUrl, githubLogin: i.assignedUser.githubLogin }
          : null,
        createdAt: i.createdAt,
      }))}
      stats={{
        services,
        schedules,
        teams,
        openIncidents: openIncidents.length,
      }}
    />
  );
}
