import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

// Signed, httpOnly session cookie backed by a short JWT (HS256).

export const SESSION_COOKIE = "gitpager_session";
const ALG = "HS256";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  role: string;
}

function secretKey(): Uint8Array {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) {
    throw new Error(
      "SESSION_SECRET is not set (or too short). Set it in .env.local — generate with `openssl rand -hex 32`.",
    );
  }
  return new TextEncoder().encode(s);
}

export async function createSessionToken(user: SessionUser): Promise<string> {
  return new SignJWT({
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl ?? null,
    role: user.role,
  })
    .setProtectedHeader({ alg: ALG })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(secretKey());
}

async function verifySessionToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (!payload.sub) return null;
    return {
      id: String(payload.sub),
      name: String(payload.name ?? ""),
      email: String(payload.email ?? ""),
      avatarUrl: (payload.avatarUrl as string | null) ?? null,
      role: String(payload.role ?? "member"),
    };
  } catch {
    return null;
  }
}

/** Read the current session in a Server Component / Route Handler. */
export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

/** Cookie options for the session cookie (set on a NextResponse). */
export function sessionCookieOptions(maxAge: number = MAX_AGE_SECONDS) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}
