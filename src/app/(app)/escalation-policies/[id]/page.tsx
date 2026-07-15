import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getOnCallNow } from "@/lib/schedules";
import { EscalationPolicyDetailView } from "./EscalationPolicyDetailView";

export default async function EscalationPolicyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [policy, users, onCallNow, session] = await Promise.all([
    db.escalationPolicy.findUnique({
      where: { id },
      include: {
        team: true,
        services: { orderBy: { name: "asc" } },
        rules: {
          orderBy: { position: "asc" },
          include: { targets: { include: { user: true, schedule: true } } },
        },
      },
    }),
    db.user.findMany({ orderBy: { name: "asc" } }),
    getOnCallNow(),
    getSession(),
  ]);

  if (!policy) notFound();

  // Map each schedule to the user currently on call, to show "→ resolves to" hints.
  const onCallBySchedule = new Map(onCallNow.map(({ schedule, user }) => [schedule.id, user?.name ?? null]));
  const schedules = onCallNow.map(({ schedule }) => ({ id: schedule.id, name: schedule.name }));

  return (
    <EscalationPolicyDetailView
      policyId={policy.id}
      name={policy.name}
      description={policy.description}
      teamName={policy.team?.name ?? null}
      repeatCount={policy.repeatCount}
      services={policy.services.map((s) => ({ id: s.id, name: s.name }))}
      rules={policy.rules.map((r, idx) => ({
        id: r.id,
        position: r.position,
        index: idx,
        delayLabel: idx === 0 ? "Immediately" : `After ${r.delayMinutes} min`,
        delayMinutes: r.delayMinutes,
        targets: r.targets.map((t) => ({
          id: t.id,
          type: t.type as "user" | "schedule",
          label: t.type === "user" ? (t.user?.name ?? "Unknown user") : (t.schedule?.name ?? "Unknown schedule"),
          avatarUrl: t.type === "user" ? (t.user?.avatarUrl ?? null) : null,
          resolvesTo: t.type === "schedule" && t.scheduleId ? (onCallBySchedule.get(t.scheduleId) ?? null) : null,
        })),
      }))}
      ruleCount={policy.rules.length}
      users={users.map((u) => ({ id: u.id, name: u.name }))}
      schedules={schedules}
      canEdit={Boolean(session)}
    />
  );
}

export const dynamic = "force-dynamic";
