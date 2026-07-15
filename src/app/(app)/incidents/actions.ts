"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import {
  acknowledgeIncident,
  resolveIncident,
  reassignIncident,
  escalateIncident,
} from "@/lib/incidents";

function revalidate(incidentId: string) {
  revalidatePath(`/incidents/${incidentId}`);
  revalidatePath("/incidents");
  revalidatePath("/dashboard");
  revalidatePath("/notifications");
}

export async function acknowledgeAction(formData: FormData) {
  const session = await getSession();
  if (!session) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await acknowledgeIncident(id, session.id);
  revalidate(id);
}

export async function resolveAction(formData: FormData) {
  const session = await getSession();
  if (!session) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await resolveIncident(id, session.id);
  revalidate(id);
}

export async function reassignAction(formData: FormData) {
  const session = await getSession();
  if (!session) return;
  const id = String(formData.get("id") ?? "");
  const userId = String(formData.get("userId") ?? "");
  if (!id || !userId) return;
  await reassignIncident(id, userId, session.id);
  revalidate(id);
}

export async function escalateAction(formData: FormData) {
  const session = await getSession();
  if (!session) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await escalateIncident(id, session.id);
  revalidate(id);
}
