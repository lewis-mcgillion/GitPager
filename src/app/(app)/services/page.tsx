import { db } from "@/lib/db";
import { OPEN_INCIDENT_STATUSES } from "@/lib/domain";
import { ServicesView } from "./ServicesView";

export default async function ServicesPage() {
  const services = await db.service.findMany({
    orderBy: { name: "asc" },
    include: {
      team: true,
      escalationPolicy: true,
      incidents: { where: { status: { in: OPEN_INCIDENT_STATUSES } }, select: { id: true } },
    },
  });

  return (
    <ServicesView
      services={services.map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        status: s.status,
        teamName: s.team?.name ?? null,
        policyName: s.escalationPolicy?.name ?? null,
        openIncidents: s.incidents.length,
      }))}
    />
  );
}
