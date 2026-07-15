import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { TeamDetailView } from "./TeamDetailView";

export default async function TeamDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const team = await db.team.findUnique({
    where: { id },
    include: {
      memberships: { include: { user: true }, orderBy: { role: "asc" } },
      services: { orderBy: { name: "asc" } },
      schedules: { orderBy: { name: "asc" } },
      escalationPolicies: { orderBy: { name: "asc" } },
    },
  });

  if (!team) notFound();

  return (
    <TeamDetailView
      name={team.name}
      slug={team.slug}
      description={team.description}
      members={team.memberships.map((m) => ({
        id: m.user.id,
        role: m.role,
        name: m.user.name,
        avatarUrl: m.user.avatarUrl,
        githubLogin: m.user.githubLogin,
      }))}
      services={team.services.map((s) => ({ id: s.id, name: s.name, status: s.status }))}
      schedules={team.schedules.map((s) => ({ id: s.id, name: s.name }))}
      policies={team.escalationPolicies.map((p) => ({ id: p.id, name: p.name }))}
    />
  );
}
