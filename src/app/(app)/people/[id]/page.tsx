import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getOnCallNow } from "@/lib/schedules";
import { OPEN_INCIDENT_STATUSES } from "@/lib/domain";
import { PersonDetailView } from "./PersonDetailView";

export default async function PersonDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [user, onCallNow] = await Promise.all([
    db.user.findUnique({
      where: { id },
      include: {
        memberships: { include: { team: true } },
        layerUsers: { include: { layer: { include: { schedule: true } } } },
        assignedIncidents: {
          where: { status: { in: OPEN_INCIDENT_STATUSES } },
          orderBy: { number: "desc" },
          include: { service: true },
        },
      },
    }),
    getOnCallNow(),
  ]);

  if (!user) notFound();

  const onCallScheduleNames = onCallNow
    .filter((o) => o.user?.id === id)
    .map((o) => o.schedule.name);

  // Distinct schedules this person participates in (via any layer).
  const scheduleMap = new Map<string, string>();
  for (const lu of user.layerUsers) {
    scheduleMap.set(lu.layer.schedule.id, lu.layer.schedule.name);
  }

  return (
    <PersonDetailView
      name={user.name}
      email={user.email}
      avatarUrl={user.avatarUrl}
      githubLogin={user.githubLogin}
      role={user.role}
      timeZone={user.timeZone}
      onCallScheduleNames={onCallScheduleNames}
      teams={user.memberships.map((m) => ({ id: m.team.id, name: m.team.name, role: m.role }))}
      schedules={[...scheduleMap.entries()].map(([sid, sname]) => ({ id: sid, name: sname }))}
      openIncidents={user.assignedIncidents.map((i) => ({
        id: i.id,
        number: i.number,
        title: i.title,
        status: i.status,
        urgency: i.urgency,
        serviceName: i.service.name,
      }))}
    />
  );
}

export const dynamic = "force-dynamic";
