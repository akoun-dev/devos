import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { errorResponse, readJsonBody, zodErrorMessage } from "@/lib/api-helpers";
import { getSessionUser } from "@/lib/auth";
import { serializeAutomation } from "@/lib/serialize";

export const dynamic = "force-dynamic";

/**
 * GET  /api/automations — liste des automatisations de l'utilisateur (contrat v1.4).
 * POST /api/automations — création (validation croisée selon triggerType).
 * Scopage strict userId ; tri updatedAt desc.
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

const baseAutomationSchema = z.object({
  name: z.string().trim().min(1).max(80),
  triggerType: z.enum(["schedule", "condition"]),
  scheduleTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "scheduleTime : heure HH:MM attendue")
    .optional(),
  scheduleDays: scheduleDaysSchema.optional(),
  conditionType: z.literal("overdue_count").optional(),
  threshold: z.number().int().min(1).max(99).optional(),
  message: z.string().max(500).optional(),
});

const createAutomationSchema = baseAutomationSchema.superRefine((data, ctx) => {
  if (data.triggerType === "schedule" && !data.scheduleTime) {
    ctx.addIssue({ code: "custom", path: ["scheduleTime"], message: "scheduleTime est requis pour un déclencheur horaire" });
  }
  if (data.triggerType === "condition" && data.conditionType !== "overdue_count") {
    ctx.addIssue({ code: "custom", path: ["conditionType"], message: "conditionType « overdue_count » est requis pour un déclencheur condition" });
  }
  if (data.triggerType === "condition" && data.threshold === undefined) {
    ctx.addIssue({ code: "custom", path: ["threshold"], message: "threshold (1..99) est requis pour un déclencheur condition" });
  }
  if (data.triggerType === "condition" && data.message && data.message.trim().length > 0) {
    ctx.addIssue({ code: "custom", path: ["message"], message: "message personnalisé : réservé au déclencheur horaire" });
  }
});

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return errorResponse("Authentification requise", 401);
    }
    const automations = await db.automation.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json({ automations: automations.map(serializeAutomation) });
  } catch (error) {
    console.error("[api/automations] GET :", error);
    return errorResponse("Erreur interne du serveur", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return errorResponse("Authentification requise", 401);
    }
    const body = await readJsonBody(request);
    const parsed = createAutomationSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(`Automatisation invalide — ${zodErrorMessage(parsed.error)}`, 400);
    }
    const data = parsed.data;
    const automation = await db.automation.create({
      data: {
        userId: user.id,
        name: data.name,
        triggerType: data.triggerType,
        ...(data.triggerType === "schedule"
          ? {
              scheduleTime: data.scheduleTime ?? null,
              scheduleDays: data.scheduleDays ?? "1,2,3,4,5",
              message: data.message?.trim() ? data.message.trim() : null,
            }
          : {
              conditionType: data.conditionType ?? null,
              threshold: data.threshold ?? null,
            }),
      },
    });
    return NextResponse.json({ automation: serializeAutomation(automation) }, { status: 201 });
  } catch (error) {
    console.error("[api/automations] POST :", error);
    return errorResponse("Erreur interne du serveur", 500);
  }
}
