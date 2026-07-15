"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";

function revalidate() {
  revalidatePath("/notifications");
  revalidatePath("/", "layout"); // refresh the sidebar unread counter
}

export async function markRead(formData: FormData) {
  const session = await getSession();
  if (!session) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await db.notification.updateMany({ where: { id, userId: session.id }, data: { read: true } });
  revalidate();
}

export async function markAllRead() {
  const session = await getSession();
  if (!session) return;
  await db.notification.updateMany({ where: { userId: session.id, read: false }, data: { read: true } });
  revalidate();
}
