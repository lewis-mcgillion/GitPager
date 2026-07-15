import { db } from "@/lib/db";
import { TeamsView } from "./TeamsView";

export default async function TeamsPage() {
  const teams = await db.team.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { memberships: true, services: true, schedules: true } },
      memberships: { include: { user: true }, take: 8 },
    },
  });

  return (
    <TeamsView
      teams={teams.map((t) => ({
        id: t.id,
        name: t.name,
        slug: t.slug,
        description: t.description,
        memberCount: t._count.memberships,
        serviceCount: t._count.services,
        scheduleCount: t._count.schedules,
        members: t.memberships.map((m) => ({ name: m.user.name, avatarUrl: m.user.avatarUrl, githubLogin: m.user.githubLogin })),
      }))}
    />
  );
}
