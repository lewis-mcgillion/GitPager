import { db } from "@/lib/db";
import { EscalationPoliciesView } from "./EscalationPoliciesView";

export default async function EscalationPoliciesPage() {
  const policies = await db.escalationPolicy.findMany({
    orderBy: { name: "asc" },
    include: {
      team: true,
      _count: { select: { rules: true, services: true } },
      rules: {
        orderBy: { position: "asc" },
        take: 1,
        include: {
          targets: { include: { user: true, schedule: true } },
        },
      },
    },
  });

  return (
    <EscalationPoliciesView
      policies={policies.map((p) => ({
        id: p.id,
        name: p.name,
        teamName: p.team?.name ?? null,
        levelCount: p._count.rules,
        serviceCount: p._count.services,
        firstLevel: p.rules[0]
          ? p.rules[0].targets.map((t) =>
              t.type === "user" ? (t.user?.name ?? "Unknown") : (t.schedule?.name ?? "Schedule"),
            )
          : [],
      }))}
    />
  );
}
