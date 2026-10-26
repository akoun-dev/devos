import { NextResponse, type NextRequest } from "next/server";
import { errorResponse } from "@/lib/api-helpers";
import { getSessionUser } from "@/lib/auth";
import { runAutomationManually } from "@/lib/assistant/automations";
import { serializeAutomationRun } from "@/lib/serialize";

export const dynamic = "force-dynamic";

/**
 * POST /api/automations/:id/run — exécution manuelle immédiate (contrat v1.4).
 * Génère l'annonce template, crée un run (idempotent à la seconde : 409 si
 * double-clic < 1 s) et met à jour lastRunAt. 404 générique inter-utilisateurs.
 */
export async function POST(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return errorResponse("Authentification requise", 401);
    }
    const { id } = await context.params;
    const outcome = await runAutomationManually(new Date(), user.id, id);
    if (!outcome.ok) {
      if (outcome.reason === "not_found") {
        return errorResponse("Automatisation introuvable", 404);
      }
      return errorResponse("Exécution déjà enregistrée à cette seconde — réessayez", 409);
    }
    return NextResponse.json({ run: serializeAutomationRun(outcome.result.run) });
  } catch (error) {
    console.error("[api/automations/:id/run] POST :", error);
    return errorResponse("Erreur interne du serveur", 500);
  }
}
