"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Spinner, Text, Flash, Button } from "@primer/react";
import { completeLogin, setStoredUser, type PdUserRef } from "@/lib/pdAuth";
import { getCurrentUser } from "@/lib/pdApi";

// OAuth redirect target. PagerDuty sends the user back here with ?code&state;
// we exchange the code for a token (PKCE, no secret), cache the profile, then
// bounce to wherever the user was heading. Reads window.location.search directly
// (rather than useSearchParams) so the static export doesn't need a Suspense
// boundary at build time.
export default function CallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return; // guard against React 18/19 double-invoke in dev
    ran.current = true;
    (async () => {
      try {
        const { returnTo } = await completeLogin(window.location.search);
        try {
          const pu = await getCurrentUser();
          const mapped: PdUserRef = {
            id: pu.id,
            name: pu.name,
            email: pu.email,
            avatarUrl: pu.avatar_url,
            teams: pu.teams?.map((t) => ({ id: t.id, name: t.summary ?? "" })),
          };
          setStoredUser(mapped);
        } catch {
          /* profile fetch is best-effort; the app layout will retry */
        }
        router.replace(returnTo || "/dashboard/");
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    })();
  }, [router]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      {error ? (
        <div style={{ maxWidth: 420, width: "100%" }}>
          <Flash variant="danger" style={{ marginBottom: 16 }}>
            Sign-in failed: {error}
          </Flash>
          <Link href="/signin/">
            <Button block>Back to sign in</Button>
          </Link>
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Spinner size="small" />
          <Text style={{ color: "var(--fgColor-muted, #656d76)" }}>Completing sign-in…</Text>
        </div>
      )}
    </div>
  );
}
