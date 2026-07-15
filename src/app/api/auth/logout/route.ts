import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";

function clear(req: Request) {
  const res = NextResponse.redirect(new URL("/signin", req.url), 303);
  res.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}

export async function POST(req: Request) {
  return clear(req);
}

// Allow GET so a plain link can log out too.
export async function GET(req: Request) {
  return clear(req);
}
