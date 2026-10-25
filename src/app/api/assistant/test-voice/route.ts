import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { errorResponse, readJsonBody, zodErrorMessage } from "@/lib/api-helpers";
import { getSessionUser } from "@/lib/auth";
import { reformulate } from "@/lib/assistant/ai";
import { buildTemplateMessage, formatDelay, humanizeDelay, type AnnouncementType, type AssistantStyle } from "@/lib/assistant/templates";

export const dynamic = "force-dynamic";

const testVoiceSchema = z
  .object({
    style: z.enum(["naturel", "professionnel", "bref"]).optional(),
    type: z.enum(["reminder", "new_task", "deadline", "priority"]).optional(),
  })
  .strict();

const SAMPLE_TITLE = "Finaliser le déploiement du projet DevOS";
const SAMPLE_DELAY_MINUTES = 45;

/**
 * POST /api/assistant/test-voice — message d'exemple produit par les MÊMES
 * builders que la production (tâche fictive). AUCUN ReminderLog créé.
 */
export async function POST(request: NextRequest) {
  try {
    // Endpoint authentifié : il déclenche un appel LLM, jamais exposé publiquement.
    if (!(await getSessionUser())) {
      return errorResponse("Authentification requise", 401);
    }
    const body = await readJsonBody(request);
    const parsed = testVoiceSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(`Requête invalide — ${zodErrorMessage(parsed.error)}`, 400);
    }
    const style: AssistantStyle = parsed.data.style ?? "naturel";
    const type: AnnouncementType = parsed.data.type ?? "reminder";

    const template = buildTemplateMessage(type, style, false, {
      title: SAMPLE_TITLE,
      delayText: humanizeDelay(SAMPLE_DELAY_MINUTES),
      priority: "haute",
    });

    let message = template;
    let messageSource: "ia" | "template" = "template";
    if (style === "naturel") {
      const reformulated = await reformulate(template, {
        type,
        title: SAMPLE_TITLE,
        delay: formatDelay(SAMPLE_DELAY_MINUTES),
        priority: "haute",
      });
      if (reformulated) {
        message = reformulated;
        messageSource = "ia";
      }
    }
    return NextResponse.json({ message, messageSource });
  } catch (error) {
    console.error("[api/assistant/test-voice] POST :", error);
    return errorResponse("Erreur interne du serveur", 500);
  }
}
