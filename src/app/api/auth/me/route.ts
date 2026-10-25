import { NextResponse } from "next/server";

import { errorResponse } from "@/lib/api-helpers";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/auth/me — profil de la session courante.
 * 200 { user } si session valide, 401 { error } sinon (le client traite 401
 * comme « session absente/expirée »).
 */
export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return errorResponse("Authentification requise", 401);
    }
    return NextResponse.json({ user });
  } catch (error) {
    console.error("[api/auth/me] GET :", error);
    return errorResponse("Erreur interne du serveur", 500);
  }
}
