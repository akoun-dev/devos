import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { errorResponse, readJsonBody, zodErrorMessage } from "@/lib/api-helpers";
import { getSessionUser } from "@/lib/auth";
import { getOrCreatePreferences } from "@/lib/assistant/scheduler";
import { serializePreferences } from "@/lib/serialize";

export const dynamic = "force-dynamic";

const HHMM_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;
const QUIET_DAYS_REGEX = /^[0-6](,[0-6])*$/;

const preferencesSchema = z
  .object({
    enabled: z.boolean(),
    reminderOffsetMinutes: z.number().int().min(1).max(10080),
    announceNewTasks: z.boolean(),
    announceDeadlines: z.boolean(),
    announcePriorities: z.boolean(),
    quietHoursEnabled: z.boolean(),
    quietStart: z.string().regex(HHMM_REGEX, "format attendu HH:mm"),
    quietEnd: z.string().regex(HHMM_REGEX, "format attendu HH:mm"),
    quietDays: z.string().regex(QUIET_DAYS_REGEX, "CSV de jours 0..6 (0 = dimanche)"),
    style: z.enum(["naturel", "professionnel", "bref"]),
    language: z.string().min(2).max(10),
    voice: z.string().max(100).nullable(),
    volume: z.number().min(0).max(1),
    allowedCategories: z.string().max(500),
    privacyMode: z.boolean(),
    urgentOverrideQuiet: z.boolean(),
    suspended: z.boolean(),
    suspendedUntil: z.iso.datetime({ offset: true }).nullable(),
  })
  .strict()
  .partial();

/** GET /api/voice-preferences — préférences de l'utilisateur connecté (créées avec les défauts si absentes). */
export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return errorResponse("Authentification requise", 401);
    }
    const prefs = await getOrCreatePreferences(user.id);
    return NextResponse.json({ preferences: serializePreferences(prefs) });
  } catch (error) {
    console.error("[api/voice-preferences] GET :", error);
    return errorResponse("Erreur interne du serveur", 500);
  }
}

/** PUT /api/voice-preferences — mise à jour partielle validée par Zod. Scopé à l'utilisateur connecté. */
export async function PUT(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return errorResponse("Authentification requise", 401);
    }
    const body = await readJsonBody(request);
    const parsed = preferencesSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(`Préférences invalides — ${zodErrorMessage(parsed.error)}`, 400);
    }
    const prefs = await getOrCreatePreferences(user.id);
    const updated = await db.voicePreferences.update({
      where: { id: prefs.id },
      data: parsed.data,
    });
    return NextResponse.json({ preferences: serializePreferences(updated) });
  } catch (error) {
    console.error("[api/voice-preferences] PUT :", error);
    return errorResponse("Erreur interne du serveur", 500);
  }
}
