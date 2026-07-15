import { db } from "@/lib/db";
import { getOnCallNow } from "@/lib/schedules";
import { PeopleView } from "./PeopleView";

export default async function PeoplePage() {
  const [users, onCallNow] = await Promise.all([
    db.user.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { memberships: true } } },
    }),
    getOnCallNow(),
  ]);

  const onCallIds = new Set(onCallNow.map((o) => o.user?.id).filter(Boolean) as string[]);

  return (
    <PeopleView
      people={users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        avatarUrl: u.avatarUrl,
        githubLogin: u.githubLogin,
        role: u.role,
        timeZone: u.timeZone,
        teamCount: u._count.memberships,
        onCall: onCallIds.has(u.id),
      }))}
    />
  );
}

export const dynamic = "force-dynamic";
