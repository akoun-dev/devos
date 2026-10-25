import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/health — sonde de santé (remplace GET /api démo, DEBT-002).
 * 200 : { status, db, time, version } · 500 : { error } si la DB est KO.
 */
export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
  } catch (error) {
    console.error("[api/health] base de données KO :", error);
    return NextResponse.json({ error: "Base de données indisponible" }, { status: 500 });
  }
  return NextResponse.json({
    status: "ok",
    db: "ok",
    time: new Date().toISOString(),
    version: "1.0.0",
  });
}
