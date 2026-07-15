import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { IncidentDetailView } from "./IncidentDetailView";

export default async function IncidentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [incident, users, session] = await Promise.all([
    db.incident.findUnique({
      where: { id },
      include: {
        service: true,
        escalationPolicy: true,
        assignedUser: true,
        logEntries: { orderBy: { createdAt: "asc" }, include: { actor: true } },
      },
    }),
    db.user.findMany({ orderBy: { name: "asc" } }),
    getSession(),
  ]);

  if (!incident) notFound();

  return (
    <IncidentDetailView
      incidentId={incident.id}
      number={incident.number}
      title={incident.title}
      description={incident.description}
      status={incident.status}
      urgency={incident.urgency}
      currentLevel={incident.currentLevel}
      createdAt={incident.createdAt}
      resolvedAt={incident.resolvedAt}
      service={{ id: incident.service.id, name: incident.service.name }}
      policy={incident.escalationPolicy ? { id: incident.escalationPolicy.id, name: incident.escalationPolicy.name } : null}
      assignedUser={
        incident.assignedUser
          ? { name: incident.assignedUser.name, avatarUrl: incident.assignedUser.avatarUrl, githubLogin: incident.assignedUser.githubLogin }
          : null
      }
      timeline={incident.logEntries.map((e) => ({
        id: e.id,
        type: e.type,
        message: e.message,
        actorName: e.actor?.name ?? null,
        createdAt: e.createdAt,
      }))}
      users={users.map((u) => ({ id: u.id, name: u.name }))}
      assignedUserId={incident.assignedUserId}
      canEdit={Boolean(session)}
    />
  );
}

export const dynamic = "force-dynamic";
