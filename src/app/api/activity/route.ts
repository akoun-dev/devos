import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { errorResponse, zodErrorMessage } from "@/lib/api-helpers";
import { getSessionUser } from "@/lib/auth";
import { serializeLog } from "@/lib/serialize";

export const dynamic = "force-dynamic";

const activityQuerySchema = z
  .object({ limit: z.coerce.number().int().min(1).max(200).optional() })
  .strict();

/**
 * GET /api/activity?limit= — journal d'activité de l'utilisateur : ReminderLog
 * de SES tâches, tri createdAt desc, limite 100 par défaut.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return errorResponse("Authentification requise", 401);
    }
    const parsedQuery = activityQuerySchema.safeParse({
      limit: request.nextUrl.searchParams.get("limit") ?? undefined,
    });
    if (!parsedQuery.success) {
      return errorResponse(`Requête invalide — ${zodErrorMessage(parsedQuery.error)}`, 400);
    }
    const limit = parsedQuery.data.limit ?? 100;
    const logs = await db.reminderLog.findMany({
      where: { task: { userId: user.id } },
      include: { task: { select: { title: true } } },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return NextResponse.json({
      activity: logs.map((log) => ({
        ...serializeLog(log),
        taskTitle: log.task?.title ?? null,
      })),
    });
  } catch (error) {
    console.error("[api/activity] GET :", error);
    return errorResponse("Erreur interne du serveur", 500);
  }
}
