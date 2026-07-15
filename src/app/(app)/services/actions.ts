"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { SERVICE_STATUSES } from "@/lib/domain";

export async function updateServiceStatus(formData: FormData) {
  if (!(await getSession())) return;
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id || !SERVICE_STATUSES.includes(status as (typeof SERVICE_STATUSES)[number])) return;

  await db.service.update({ where: { id }, data: { status } });
  revalidatePath(`/services/${id}`);
  revalidatePath("/services");
}
