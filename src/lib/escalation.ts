// Escalation resolution: pure functions for turning an escalation policy into the
// set of users to notify at a given level/time. Schedule targets are resolved via
// an injected callback so this module stays free of Prisma and on-call internals.

export interface EscalationTargetInput {
  type: "user" | "schedule";
  userId?: string | null;
  scheduleId?: string | null;
}

export interface EscalationRuleInput {
  position: number;
  delayMinutes: number;
  targets: EscalationTargetInput[];
}

export interface EscalationPolicyInput {
  rules: EscalationRuleInput[];
  /** Number of extra times to repeat all levels if still unacknowledged. */
  repeatCount: number;
}

/** Resolves the current on-call user id for a schedule at a given time. */
export type OnCallResolver = (scheduleId: string, at: Date) => string | null;

/**
 * The distinct user ids to notify for a single escalation rule/level at `at`.
 * Schedule targets are resolved to their current on-call user.
 */
export function resolveLevelTargets(
  rule: EscalationRuleInput,
  at: Date,
  onCall: OnCallResolver,
): string[] {
  const users = new Set<string>();
  for (const target of rule.targets) {
    if (target.type === "user" && target.userId) {
      users.add(target.userId);
    } else if (target.type === "schedule" && target.scheduleId) {
      const u = onCall(target.scheduleId, at);
      if (u) users.add(u);
    }
  }
  return [...users];
}

/**
 * Zero-based index of the escalation rule that is active after `minutesElapsed`
 * minutes without acknowledgement, honouring repeatCount. Clamps to the last
 * rule once every pass is exhausted.
 */
export function levelIndexAfter(
  policy: EscalationPolicyInput,
  minutesElapsed: number,
): number {
  const rules = [...policy.rules].sort((a, b) => a.position - b.position);
  if (rules.length === 0) return 0;
  if (minutesElapsed <= 0) return 0;

  const totalPasses = Math.max(0, policy.repeatCount) + 1;
  let acc = 0;
  for (let pass = 0; pass < totalPasses; pass++) {
    for (let i = 0; i < rules.length; i++) {
      acc += rules[i].delayMinutes;
      if (minutesElapsed < acc) return i;
    }
  }
  return rules.length - 1;
}

/**
 * The users to notify for a policy after `minutesElapsed` minutes unacknowledged.
 */
export function resolveEscalationTargetsAt(
  policy: EscalationPolicyInput,
  triggeredAt: Date,
  now: Date,
  onCall: OnCallResolver,
): { levelIndex: number; userIds: string[] } {
  const rules = [...policy.rules].sort((a, b) => a.position - b.position);
  if (rules.length === 0) return { levelIndex: 0, userIds: [] };

  const minutesElapsed = (now.getTime() - triggeredAt.getTime()) / 60_000;
  const levelIndex = levelIndexAfter(policy, minutesElapsed);
  const userIds = resolveLevelTargets(rules[levelIndex], now, onCall);
  return { levelIndex, userIds };
}
