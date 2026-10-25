import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { errorResponse, readJsonBody, zodErrorMessage } from "@/lib/api-helpers";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const snoozeSchema = z
  .object({
    logId: z.string().min(1),
    minutes: z.number().int().min(1).max(1440),
  })
  .strict();

/**
 * POST /api/assistant/snooze — reporte une annonce : le log passe à "reporte"
 * avec snoozedUntil = now + minutes ; il sera re-déclenché au tick échu si la
 * tâche est toujours en cours (contrat v1).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await readJsonBody(request);
    const parsed = snoozeSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(`Requête invalide — ${zodErrorMessage(parsed.error)}`, 400);
    }
    const user = await getSessionUser();
    if (!user) {
      return errorResponse("Authentification requise", 401);
    }
    const { logId, minutes } = parsed.data;
    // Ownership : le log doit appartenir à une tâche de l'utilisateur (404 générique
    // sinon, sans divulgation d'existence).
    const log = await db.reminderLog.findUnique({
      where: { id: logId },
      include: { task: { select: { userId: true } } },
    });
    if (!log || log.task?.userId !== user.id) {
      return errorResponse("Annonce introuvable", 404);
    }
    const now = new Date();
    await db.reminderLog.update({
      where: { id: logId },
      data: {
        status: "reporte",
        snoozedUntil: new Date(now.getTime() + minutes * 60_000),
        firedAt: null,
      },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[api/assistant/snooze] POST :", error);
    return errorResponse("Erreur interne du serveur", 500);
  }
}
