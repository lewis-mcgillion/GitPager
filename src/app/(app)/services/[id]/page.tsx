import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { ServiceDetailView } from "./ServiceDetailView";

export default async function ServiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [service, session] = await Promise.all([
    db.service.findUnique({
      where: { id },
      include: {
        team: true,
        escalationPolicy: true,
        incidents: {
          orderBy: { number: "desc" },
          take: 10,
          include: { assignedUser: true },
        },
      },
    }),
    getSession(),
  ]);

  if (!service) notFound();

  return (
    <ServiceDetailView
      serviceId={service.id}
      name={service.name}
      description={service.description}
      status={service.status}
      teamName={service.team?.name ?? null}
      integrationKey={service.integrationKey}
      policy={service.escalationPolicy ? { id: service.escalationPolicy.id, name: service.escalationPolicy.name } : null}
      incidents={service.incidents.map((i) => ({
        id: i.id,
        number: i.number,
        title: i.title,
        status: i.status,
        urgency: i.urgency,
        createdAt: i.createdAt,
        assignedUser: i.assignedUser
          ? { name: i.assignedUser.name, avatarUrl: i.assignedUser.avatarUrl, githubLogin: i.assignedUser.githubLogin }
          : null,
      }))}
      canEdit={Boolean(session)}
    />
  );
}

export const dynamic = "force-dynamic";
