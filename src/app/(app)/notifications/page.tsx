import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { NotificationsView } from "./NotificationsView";

export default async function NotificationsPage() {
  const session = await getSession();
  if (!session) return null;

  const notifications = await db.notification.findMany({
    where: { userId: session.id },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { incident: true },
  });

  return (
    <NotificationsView
      hasUnread={notifications.some((n) => !n.read)}
      notifications={notifications.map((n) => ({
        id: n.id,
        message: n.message,
        channel: n.channel,
        read: n.read,
        createdAt: n.createdAt,
        incidentId: n.incidentId,
        incidentNumber: n.incident.number,
        incidentTitle: n.incident.title,
      }))}
    />
  );
}

export const dynamic = "force-dynamic";
