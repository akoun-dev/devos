import { NextResponse } from "next/server";

import { sessionCookieOptions, SESSION_COOKIE_NAME } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** POST /api/auth/logout — supprime le cookie de session (idempotent). */
export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE_NAME, "", sessionCookieOptions(0));
  return response;
}
