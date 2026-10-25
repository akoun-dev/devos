import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { errorResponse, readJsonBody, zodErrorMessage } from "@/lib/api-helpers";
import { runTick } from "@/lib/assistant/scheduler";

export const dynamic = "force-dynamic";

const tickSchema = z
  .object({
    now: z.iso.datetime({ offset: true }).optional(),
  })
  .strict();

/**
 * POST /api/assistant/tick — cœur du ReminderScheduler (ADR-002, état dérivé).
 * IDEMPOTENT : 2 ticks consécutifs ne redonnent jamais la même annonce
 * (mémoire ReminderLog, contrainte @@unique(taskId,type,scheduledFor)).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await readJsonBody(request);
    const parsed = tickSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(`Requête invalide — ${zodErrorMessage(parsed.error)}`, 400);
    }
    const now = parsed.data.now ? new Date(parsed.data.now) : new Date();
    if (Number.isNaN(now.getTime())) {
      return errorResponse("Requête invalide — now : date ISO invalide", 400);
    }
    const result = await runTick(now);
    return NextResponse.json({
      announcements: result.announcements,
      now: result.now.toISOString(),
      quietHours: result.quietHours,
    });
  } catch (error) {
    console.error("[api/assistant/tick] POST :", error);
    return errorResponse("Erreur interne du serveur", 500);
  }
}
