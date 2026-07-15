"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";

function revalidate(policyId: string) {
  revalidatePath(`/escalation-policies/${policyId}`);
  revalidatePath("/escalation-policies");
}

// Append a new escalation level at the bottom of the policy.
export async function addRule(formData: FormData) {
  if (!(await getSession())) return;
  const policyId = String(formData.get("policyId") ?? "");
  if (!policyId) return;

  const last = await db.escalationRule.findFirst({
    where: { policyId },
    orderBy: { position: "desc" },
  });
  const position = last ? last.position + 1 : 0;

  await db.escalationRule.create({ data: { policyId, position, delayMinutes: 30 } });
  revalidate(policyId);
}

export async function deleteRule(formData: FormData) {
  if (!(await getSession())) return;
  const id = String(formData.get("id") ?? "");
  const policyId = String(formData.get("policyId") ?? "");
  if (!id) return;

  await db.escalationRule.delete({ where: { id } }).catch(() => undefined);
  revalidate(policyId);
}

export async function updateRuleDelay(formData: FormData) {
  if (!(await getSession())) return;
  const id = String(formData.get("id") ?? "");
  const policyId = String(formData.get("policyId") ?? "");
  const delay = Number(formData.get("delayMinutes"));
  if (!id || Number.isNaN(delay) || delay < 0) return;

  await db.escalationRule.update({ where: { id }, data: { delayMinutes: Math.round(delay) } });
  revalidate(policyId);
}

// Swap a rule with its neighbour in the given direction. Positions are unique per
// policy, so the swap goes through a temporary sentinel position to avoid a
// transient unique-constraint collision.
export async function moveRule(formData: FormData) {
  if (!(await getSession())) return;
  const id = String(formData.get("id") ?? "");
  const policyId = String(formData.get("policyId") ?? "");
  const direction = String(formData.get("direction") ?? "");
  if (!id || (direction !== "up" && direction !== "down")) return;

  const rule = await db.escalationRule.findUnique({ where: { id } });
  if (!rule) return;

  const neighbour = await db.escalationRule.findFirst({
    where: {
      policyId: rule.policyId,
      position: direction === "up" ? { lt: rule.position } : { gt: rule.position },
    },
    orderBy: { position: direction === "up" ? "desc" : "asc" },
  });
  if (!neighbour) return;

  await db.$transaction([
    db.escalationRule.update({ where: { id: rule.id }, data: { position: -1 } }),
    db.escalationRule.update({ where: { id: neighbour.id }, data: { position: rule.position } }),
    db.escalationRule.update({ where: { id: rule.id }, data: { position: neighbour.position } }),
  ]);
  revalidate(policyId);
}

export async function addTarget(formData: FormData) {
  if (!(await getSession())) return;
  const ruleId = String(formData.get("ruleId") ?? "");
  const policyId = String(formData.get("policyId") ?? "");
  const value = String(formData.get("target") ?? ""); // "user:<id>" | "schedule:<id>"
  if (!ruleId || !value.includes(":")) return;

  const [type, targetId] = value.split(":");
  if (!targetId) return;

  if (type === "user") {
    const exists = await db.escalationTarget.findFirst({ where: { ruleId, type: "user", userId: targetId } });
    if (!exists) await db.escalationTarget.create({ data: { ruleId, type: "user", userId: targetId } });
  } else if (type === "schedule") {
    const exists = await db.escalationTarget.findFirst({ where: { ruleId, type: "schedule", scheduleId: targetId } });
    if (!exists) await db.escalationTarget.create({ data: { ruleId, type: "schedule", scheduleId: targetId } });
  }
  revalidate(policyId);
}

export async function deleteTarget(formData: FormData) {
  if (!(await getSession())) return;
  const id = String(formData.get("id") ?? "");
  const policyId = String(formData.get("policyId") ?? "");
  if (!id) return;

  await db.escalationTarget.delete({ where: { id } }).catch(() => undefined);
  revalidate(policyId);
}
