import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { errorResponse, readJsonBody, zodErrorMessage } from "@/lib/api-helpers";
import { getSessionUser } from "@/lib/auth";
import { serializeAutomation, serializeAutomationRun } from "@/lib/serialize";

export const dynamic = "force-dynamic";

/**
 * GET    /api/automations/:id — détail + 10 derniers runs (contrat v1.4).
 * PATCH  /api/automations/:id — mise à jour partielle (toggle enabled, renommage,
 *          modification du déclencheur avec la même validation croisée que le POST).
 * DELETE /api/automations/:id — suppression (runs en cascade).
 * 404 générique si inexistant ou appartenant à un autre utilisateur.
 */

const SCHEDULE_DAYS_MESSAGE = "scheduleDays : CSV de jours 0..6 attendu (0 = dimanche)";

const scheduleDaysSchema = z
  .string()
  .trim()
  .refine(
    (value) =>
      value
        .split(",")
        .map((part) => part.trim())
        .every((part) => /^([0-6])$/.test(part)) && value.length > 0,
    { message: SCHEDULE_DAYS_MESSAGE },
  );

const updateAutomationSchema = z
  .object({
    name: z.string().trim().min(1).max(80).optional(),
    enabled: z.boolean().optional(),
    triggerType: z.enum(["schedule", "condition"]).optional(),
    scheduleTime: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "scheduleTime : heure HH:MM attendue")
      .nullable()
      .optional(),
    scheduleDays: scheduleDaysSchema.optional(),
    conditionType: z.literal("overdue_count").nullable().optional(),
    threshold: z.number().int().min(1).max(99).nullable().optional(),
    message: z.string().max(500).nullable().optional(),
  })
  .strict();

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return errorResponse("Authentification requise", 401);
    }
    const { id } = await context.params;
    const automation = await db.automation.findFirst({ where: { id, userId: user.id } });
    if (!automation) {
      return errorResponse("Automatisation introuvable", 404);
    }
    const runs = await db.automationRun.findMany({
      where: { automationId: automation.id },
      orderBy: { createdAt: "desc" },
      take: 10,
    });
    return NextResponse.json({
      automation: serializeAutomation(automation),
      runs: runs.map(serializeAutomationRun),
    });
  } catch (error) {
    console.error("[api/automations/:id] GET :", error);
    return errorResponse("Erreur interne du serveur", 500);
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return errorResponse("Authentification requise", 401);
    }
    const { id } = await context.params;
    const body = await readJsonBody(request);
    const parsed = updateAutomationSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(`Automatisation invalide — ${zodErrorMessage(parsed.error)}`, 400);
    }
    const existing = await db.automation.findFirst({ where: { id, userId: user.id } });
    if (!existing) {
      return errorResponse("Automatisation introuvable", 404);
    }
    const data = parsed.data;

    // Validation croisée sur l'état FUTUR (champs fournis sinon valeur existante).
    const future = {
      triggerType: data.triggerType ?? existing.triggerType,
      scheduleTime:
        data.scheduleTime !== undefined ? data.scheduleTime : existing.scheduleTime,
      conditionType:
        data.conditionType !== undefined ? data.conditionType : existing.conditionType,
      threshold: data.threshold !== undefined ? data.threshold : existing.threshold,
    };
    if (future.triggerType === "schedule" && !future.scheduleTime) {
      return errorResponse("Automatisation invalide — scheduleTime est requis pour un déclencheur horaire", 400);
    }
    if (future.triggerType === "condition" && (future.conditionType !== "overdue_count" || !future.threshold)) {
      return errorResponse(
        "Automatisation invalide — conditionType « overdue_count » et threshold (1..99) sont requis pour un déclencheur condition",
        400,
      );
    }

    const automation = await db.automation.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.enabled !== undefined ? { enabled: data.enabled } : {}),
        ...(data.triggerType !== undefined ? { triggerType: data.triggerType } : {}),
        ...(data.scheduleTime !== undefined ? { scheduleTime: data.scheduleTime } : {}),
        ...(data.scheduleDays !== undefined ? { scheduleDays: data.scheduleDays } : {}),
        ...(data.conditionType !== undefined ? { conditionType: data.conditionType } : {}),
        ...(data.threshold !== undefined ? { threshold: data.threshold } : {}),
        ...(data.message !== undefined
          ? { message: data.message && data.message.trim().length > 0 ? data.message.trim() : null }
          : {}),
      },
    });
    return NextResponse.json({ automation: serializeAutomation(automation) });
  } catch (error) {
    console.error("[api/automations/:id] PATCH :", error);
    return errorResponse("Erreur interne du serveur", 500);
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return errorResponse("Authentification requise", 401);
    }
    const { id } = await context.params;
    const existing = await db.automation.findFirst({ where: { id, userId: user.id } });
    if (!existing) {
      return errorResponse("Automatisation introuvable", 404);
    }
    await db.automation.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[api/automations/:id] DELETE :", error);
    return errorResponse("Erreur interne du serveur", 500);
  }
}
