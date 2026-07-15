"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated } from "@/lib/pdAuth";
import { Loading } from "@/components/ui";

// GitPager has no dedicated landing page — send visitors straight to the app
// (or to sign-in if they're not authenticated yet).
export default function Home() {
  const router = useRouter();
  useEffect(() => {
    router.replace(isAuthenticated() ? "/dashboard/" : "/signin/");
  }, [router]);
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Loading label="Loading GitPager…" />
    </div>
  );
}
