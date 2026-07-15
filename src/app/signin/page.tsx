import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { isOidcEnabled, isDevLoginEnabled } from "@/lib/oidc";
import { SignInView } from "@/components/SignInView";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getSession();
  if (session) redirect("/dashboard");

  const { error } = await searchParams;
  const devEnabled = isDevLoginEnabled();

  const users = devEnabled
    ? await db.user.findMany({
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
          githubLogin: true,
          role: true,
        },
      })
    : [];

  return (
    <SignInView
      users={users}
      oidcEnabled={isOidcEnabled()}
      devEnabled={devEnabled}
      error={error ?? null}
    />
  );
}
