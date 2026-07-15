"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";

// Create a manual override ("cover for me") on a schedule. Overrides win over the
// underlying rotations while active.
export async function createOverride(formData: FormData) {
  const session = await getSession();
  if (!session) return;

  const scheduleId = String(formData.get("scheduleId") ?? "");
  const userId = String(formData.get("userId") ?? "");
  const startRaw = String(formData.get("start") ?? "");
  const endRaw = String(formData.get("end") ?? "");

  const start = new Date(startRaw);
  const end = new Date(endRaw);
  if (!scheduleId || !userId) return;
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return;
  if (end <= start) return;

  await db.override.create({ data: { scheduleId, userId, start, end } });

  revalidatePath(`/schedules/${scheduleId}`);
  revalidatePath("/schedules");
  revalidatePath("/dashboard");
}

export async function deleteOverride(formData: FormData) {
  const session = await getSession();
  if (!session) return;

  const id = String(formData.get("id") ?? "");
  const scheduleId = String(formData.get("scheduleId") ?? "");
  if (!id) return;

  await db.override.delete({ where: { id } }).catch(() => undefined);

  revalidatePath(`/schedules/${scheduleId}`);
  revalidatePath("/schedules");
  revalidatePath("/dashboard");
}
