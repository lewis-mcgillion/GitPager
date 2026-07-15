import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isDevLoginEnabled } from "@/lib/oidc";
import { createSessionToken, sessionCookieOptions, SESSION_COOKIE } from "@/lib/session";

// Dev-only login: signs in as a seeded user without any external IdP. Guarded so
// it is unavailable once AUTH_MODE=oidc.
export async function POST(req: Request) {
  if (!isDevLoginEnabled()) {
    return NextResponse.json({ error: "Dev login is disabled (AUTH_MODE is not 'dev')." }, { status: 403 });
  }

  const form = await req.formData();
  const userId = String(form.get("userId") ?? "");
  if (!userId) {
    return NextResponse.redirect(new URL("/signin?error=missing_user", req.url), 303);
  }

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) {
    return NextResponse.redirect(new URL("/signin?error=unknown_user", req.url), 303);
  }

  const token = await createSessionToken({
    id: user.id,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl,
    role: user.role,
  });

  const res = NextResponse.redirect(new URL("/dashboard", req.url), 303);
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  return res;
}
