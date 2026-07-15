import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { AppShell } from "@/components/AppShell";

// Auth guard for every page in the (app) route group. Unauthenticated visitors
// are redirected to the sign-in screen.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) {
    redirect("/signin");
  }

  const notificationCount = await db.notification.count({
    where: { userId: session.id, read: false },
  });

  return (
    <AppShell user={session} notificationCount={notificationCount}>
      {children}
    </AppShell>
  );
}
