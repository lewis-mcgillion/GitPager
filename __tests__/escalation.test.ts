import { describe, it, expect } from "vitest";
import {
  resolveLevelTargets,
  levelIndexAfter,
  resolveEscalationTargetsAt,
  type EscalationPolicyInput,
  type EscalationRuleInput,
} from "@/lib/escalation";

const NOW = new Date("2026-01-05T12:00:00.000Z");

describe("resolveLevelTargets", () => {
  it("collects direct user targets", () => {
    const rule: EscalationRuleInput = {
      position: 0,
      delayMinutes: 30,
      targets: [
        { type: "user", userId: "u1" },
        { type: "user", userId: "u2" },
      ],
    };
    expect(resolveLevelTargets(rule, NOW, () => null).sort()).toEqual(["u1", "u2"]);
  });

  it("resolves schedule targets to the current on-call user", () => {
    const rule: EscalationRuleInput = {
      position: 0,
      delayMinutes: 30,
      targets: [
        { type: "user", userId: "u1" },
        { type: "schedule", scheduleId: "sched-a" },
      ],
    };
    const onCall = (scheduleId: string) => (scheduleId === "sched-a" ? "u2" : null);
    expect(resolveLevelTargets(rule, NOW, onCall).sort()).toEqual(["u1", "u2"]);
  });

  it("deduplicates when a schedule resolves to an already-listed user", () => {
    const rule: EscalationRuleInput = {
      position: 0,
      delayMinutes: 30,
      targets: [
        { type: "user", userId: "u1" },
        { type: "schedule", scheduleId: "sched-a" },
      ],
    };
    expect(resolveLevelTargets(rule, NOW, () => "u1")).toEqual(["u1"]);
  });

  it("skips schedule targets with no one on call", () => {
    const rule: EscalationRuleInput = {
      position: 0,
      delayMinutes: 30,
      targets: [{ type: "schedule", scheduleId: "empty" }],
    };
    expect(resolveLevelTargets(rule, NOW, () => null)).toEqual([]);
  });
});

const policy: EscalationPolicyInput = {
  repeatCount: 0,
  rules: [
    { position: 0, delayMinutes: 30, targets: [{ type: "user", userId: "l0" }] },
    { position: 1, delayMinutes: 30, targets: [{ type: "user", userId: "l1" }] },
  ],
};

describe("levelIndexAfter", () => {
  it("starts at level 0", () => {
    expect(levelIndexAfter(policy, 0)).toBe(0);
    expect(levelIndexAfter(policy, 10)).toBe(0);
  });

  it("escalates to level 1 at the first delay boundary", () => {
    expect(levelIndexAfter(policy, 30)).toBe(1);
    expect(levelIndexAfter(policy, 59)).toBe(1);
  });

  it("clamps to the last level once all passes are exhausted", () => {
    expect(levelIndexAfter(policy, 60)).toBe(1);
    expect(levelIndexAfter(policy, 10_000)).toBe(1);
  });

  it("repeats the policy when repeatCount > 0", () => {
    const repeating: EscalationPolicyInput = { ...policy, repeatCount: 1 };
    expect(levelIndexAfter(repeating, 60)).toBe(0); // wraps back to level 0
    expect(levelIndexAfter(repeating, 90)).toBe(1);
    expect(levelIndexAfter(repeating, 120)).toBe(1); // clamps after all passes
  });
});

describe("resolveEscalationTargetsAt", () => {
  it("returns the users for the currently-active level", () => {
    const triggeredAt = new Date(NOW.getTime() - 35 * 60_000); // 35 min ago
    const result = resolveEscalationTargetsAt(policy, triggeredAt, NOW, () => null);
    expect(result.levelIndex).toBe(1);
    expect(result.userIds).toEqual(["l1"]);
  });

  it("returns level 0 immediately after trigger", () => {
    const result = resolveEscalationTargetsAt(policy, NOW, NOW, () => null);
    expect(result.levelIndex).toBe(0);
    expect(result.userIds).toEqual(["l0"]);
  });
});
