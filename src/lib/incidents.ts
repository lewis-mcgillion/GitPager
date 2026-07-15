// Incident lifecycle logic shared by the Events API (programmatic) and the
// Incidents UI (server actions). Kept in one place so triggering an incident
// from an HTTP event and from a button click behave identically: assignment via
// the escalation policy, timeline log entries, and simulated notifications.

import { db } from "./db";
import { OPEN_INCIDENT_STATUSES, type IncidentUrgency } from "./domain";
import {
  resolveEscalationTargetsAt,
  resolveLevelTargets,
  type EscalationPolicyInput,
  type EscalationRuleInput,
  type OnCallResolver,
} from "./escalation";
import { whoIsOnCall } from "./oncall";
import { scheduleInclude, toResolvable } from "./schedules";

/** Map a PagerDuty-style severity to GitPager's two urgency levels. */
export function urgencyForSeverity(severity?: string | null): IncidentUrgency {
  if (!severity) return "high";
  return ["critical", "error", "high"].includes(severity.toLowerCase()) ? "high" : "low";
}

interface LoadedPolicy {
  input: EscalationPolicyInput;
  onCall: OnCallResolver;
  ruleCount: number;
}

// Load a policy and prebuild a synchronous on-call resolver for any schedules it
// targets (the pure escalation resolver can't touch the database itself).
async function loadPolicy(policyId: string | null, now: Date): Promise<LoadedPolicy | null> {
  if (!policyId) return null;
  const policy = await db.escalationPolicy.findUnique({
    where: { id: policyId },
    include: { rules: { orderBy: { position: "asc" }, include: { targets: true } } },
  });
  if (!policy) return null;

  const scheduleIds = new Set<string>();
  for (const rule of policy.rules) {
    for (const t of rule.targets) {
      if (t.type === "schedule" && t.scheduleId) scheduleIds.add(t.scheduleId);
    }
  }

  const onCallMap = new Map<string, string | null>();
  if (scheduleIds.size > 0) {
    const schedules = await db.schedule.findMany({ where: { id: { in: [...scheduleIds] } }, include: scheduleInclude });
    for (const s of schedules) onCallMap.set(s.id, whoIsOnCall(toResolvable(s), now));
  }
  const onCall: OnCallResolver = (scheduleId) => onCallMap.get(scheduleId) ?? null;

  const input: EscalationPolicyInput = {
    repeatCount: policy.repeatCount,
    rules: policy.rules.map((r) => ({
      position: r.position,
      delayMinutes: r.delayMinutes,
      targets: r.targets.map((t) => ({
        type: t.type as "user" | "schedule",
        userId: t.userId,
        scheduleId: t.scheduleId,
      })),
    })),
  };

  return { input, onCall, ruleCount: policy.rules.length };
}

// Simulated notification delivery: writes in-app Notification rows. The pluggable
// point where real email/Slack/SMS channels could be added later.
async function notify(incidentId: string, userIds: string[], message: string): Promise<void> {
  await Promise.all(
    userIds.map((userId) =>
      db.notification.create({ data: { incidentId, userId, channel: "inapp", message } }),
    ),
  );
}

export interface TriggerIncidentInput {
  service: { id: string; name: string; escalationPolicyId: string | null };
  title: string;
  description?: string | null;
  urgency?: IncidentUrgency;
  dedupKey?: string | null;
  actorUserId?: string | null;
}

export interface TriggerResult {
  incidentId: string;
  number: number;
  status: string;
  deduped: boolean;
}

/** Trigger (or dedup) an incident and notify the first escalation level. */
export async function triggerIncident(input: TriggerIncidentInput): Promise<TriggerResult> {
  const now = new Date();

  if (input.dedupKey) {
    const existing = await db.incident.findFirst({
      where: {
        serviceId: input.service.id,
        dedupKey: input.dedupKey,
        status: { in: OPEN_INCIDENT_STATUSES },
      },
    });
    if (existing) {
      return { incidentId: existing.id, number: existing.number, status: existing.status, deduped: true };
    }
  }

  const last = await db.incident.findFirst({ orderBy: { number: "desc" }, select: { number: true } });
  const number = (last?.number ?? 0) + 1;

  const loaded = await loadPolicy(input.service.escalationPolicyId, now);
  const resolved = loaded ? resolveEscalationTargetsAt(loaded.input, now, now, loaded.onCall) : { levelIndex: 0, userIds: [] };
  const assignedUserId = resolved.userIds[0] ?? null;

  const incident = await db.incident.create({
    data: {
      number,
      title: input.title,
      description: input.description ?? null,
      status: "triggered",
      urgency: input.urgency ?? "high",
      serviceId: input.service.id,
      escalationPolicyId: input.service.escalationPolicyId,
      currentLevel: resolved.levelIndex,
      assignedUserId,
      dedupKey: input.dedupKey ?? null,
    },
  });

  await db.incidentLogEntry.create({
    data: {
      incidentId: incident.id,
      type: "triggered",
      actorUserId: input.actorUserId ?? null,
      message: `Triggered on ${input.service.name}`,
    },
  });

  if (resolved.userIds.length > 0) {
    await db.incidentLogEntry.create({
      data: {
        incidentId: incident.id,
        type: "notified",
        message: `Notified ${resolved.userIds.length} responder${resolved.userIds.length === 1 ? "" : "s"} at level ${resolved.levelIndex + 1}`,
      },
    });
    await notify(incident.id, resolved.userIds, `You were paged for #${number}: ${input.title}`);
  }

  return { incidentId: incident.id, number, status: incident.status, deduped: false };
}

/** Acknowledge an open incident. */
export async function acknowledgeIncident(incidentId: string, actorUserId: string | null) {
  const incident = await db.incident.findUnique({ where: { id: incidentId } });
  if (!incident || incident.status === "resolved") return incident;

  const updated = await db.incident.update({
    where: { id: incidentId },
    data: { status: "acknowledged", assignedUserId: actorUserId ?? incident.assignedUserId },
  });
  await db.incidentLogEntry.create({
    data: { incidentId, type: "acknowledged", actorUserId, message: "Acknowledged" },
  });
  return updated;
}

/** Resolve an incident. */
export async function resolveIncident(incidentId: string, actorUserId: string | null) {
  const incident = await db.incident.findUnique({ where: { id: incidentId } });
  if (!incident || incident.status === "resolved") return incident;

  const updated = await db.incident.update({
    where: { id: incidentId },
    data: { status: "resolved", resolvedAt: new Date() },
  });
  await db.incidentLogEntry.create({
    data: { incidentId, type: "resolved", actorUserId, message: "Resolved" },
  });
  return updated;
}

/** Reassign an incident to a specific user. */
export async function reassignIncident(incidentId: string, userId: string, actorUserId: string | null) {
  const [incident, user] = await Promise.all([
    db.incident.findUnique({ where: { id: incidentId } }),
    db.user.findUnique({ where: { id: userId } }),
  ]);
  if (!incident || !user || incident.status === "resolved") return incident;

  const updated = await db.incident.update({ where: { id: incidentId }, data: { assignedUserId: userId } });
  await db.incidentLogEntry.create({
    data: { incidentId, type: "reassigned", actorUserId, message: `Reassigned to ${user.name}` },
  });
  await notify(incidentId, [userId], `Incident #${updated.number} was assigned to you`);
  return updated;
}

/** Manually escalate an incident to the next level of its policy and notify. */
export async function escalateIncident(incidentId: string, actorUserId: string | null) {
  const incident = await db.incident.findUnique({ where: { id: incidentId } });
  if (!incident || incident.status === "resolved" || !incident.escalationPolicyId) return incident;

  const now = new Date();
  const loaded = await loadPolicy(incident.escalationPolicyId, now);
  if (!loaded || loaded.ruleCount === 0) return incident;

  const nextLevel = Math.min(incident.currentLevel + 1, loaded.ruleCount - 1);
  if (nextLevel === incident.currentLevel) return incident; // already at the top

  const rule: EscalationRuleInput = loaded.input.rules[nextLevel];
  const userIds = resolveLevelTargets(rule, now, loaded.onCall);

  const updated = await db.incident.update({
    where: { id: incidentId },
    data: { currentLevel: nextLevel, assignedUserId: userIds[0] ?? incident.assignedUserId, status: "triggered" },
  });
  await db.incidentLogEntry.create({
    data: { incidentId, type: "escalated", actorUserId, message: `Escalated to level ${nextLevel + 1}` },
  });
  if (userIds.length > 0) {
    await notify(incidentId, userIds, `Incident #${updated.number} escalated to you (level ${nextLevel + 1})`);
  }
  return updated;
}
