"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated, getStoredUser, setStoredUser, logout, type PdUserRef } from "@/lib/pdAuth";
import { getCurrentUser } from "@/lib/pdApi";
import { AppShell } from "@/components/AppShell";
import { Loading } from "@/components/ui";

// Client-side auth guard for the whole authenticated app. GitPager is a static
// export with no server, so route protection happens here in the browser:
// unauthenticated visitors are redirected to /signin/. When authenticated but we
// don't yet have the user's profile cached, we fetch it once from PagerDuty.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<PdUserRef | null>(null);

  useEffect(() => {
    let active = true;
    async function init() {
      if (!isAuthenticated()) {
        router.replace("/signin/");
        return;
      }
      const cached = getStoredUser();
      if (cached && cached.teams) {
        if (active) {
          setUser(cached);
          setReady(true);
        }
        return;
      }
      try {
        const pu = await getCurrentUser();
        if (!active) return;
        const mapped: PdUserRef = {
          id: pu.id,
          name: pu.name,
          email: pu.email,
          avatarUrl: pu.avatar_url,
          teams: pu.teams?.map((t) => ({ id: t.id, name: t.summary ?? "" })),
        };
        setStoredUser(mapped);
        setUser(mapped);
        setReady(true);
      } catch {
        logout();
        router.replace("/signin/");
      }
    }
    init();
    return () => {
      active = false;
    };
  }, [router]);

  if (!ready) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Loading label="Loading GitPager…" />
      </div>
    );
  }

  return <AppShell user={user}>{children}</AppShell>;
}
