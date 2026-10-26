import { NextResponse, type NextRequest } from "next/server";
import ZAI from "z-ai-web-dev-sdk";
import { z } from "zod";
import { db } from "@/lib/db";
import { errorResponse, rateLimitedResponse, readJsonBody, zodErrorMessage } from "@/lib/api-helpers";
import { getSessionUser } from "@/lib/auth";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * POST /api/ai/chat — Assistant IA conversationnel (FEATURE-UI-SHELL).
 *
 * Sécurité (ROLES_PERMISSIONS.md §3) : l'assistant n'a AUCUN accès outillé aux
 * données en v1 — il ne voit que la conversation fournie. Le contexte produit
 * (nb de tâches/projets) est injecté côté serveur comme simple indice textuel.
 * Rate limiting : 10 requêtes / 5 min / IP (limiteur mémoire DEBT-021).
 * SDK z-ai-web-dev-sdk : BACKEND uniquement.
 */

const chatMessageSchema = z
  .object({
    role: z.enum(["user", "assistant"]),
    content: z.string().trim().min(1).max(4_000),
  })
  .strict();

const chatSchema = z
  .object({
    messages: z.array(chatMessageSchema).min(1).max(20),
    /** Contexte choisi dans l'UI : influe sur le ton/le rôle système. */
    context: z.enum(["general", "dev", "planification"]).optional(),
  })
  .strict();

const CONTEXT_PROMPTS: Record<string, string> = {
  general:
    "Tu es l'Assistant IA de DevOS, un système d'exploitation de productivité personnelle. Réponds en français, de façon claire et concise (markdown léger autorisé).",
  dev: "Tu es l'Assistant IA de DevOS, mode Développement. Tu aides sur le code, l'architecture et le débogage. Réponds en français, avec des extraits de code pertinents.",
  planification:
    "Tu es l'Assistant IA de DevOS, mode Planification. Tu aides à organiser projets, tâches, priorités et échéances. Réponds en français, avec des listes actionnables.",
};

const AI_RATE_LIMIT = 10;
const AI_WINDOW_MS = 5 * 60 * 1000;

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return errorResponse("Authentification requise", 401);
    }

    const verdict = checkRateLimit(`ai:${clientIp(request)}`, AI_RATE_LIMIT, AI_WINDOW_MS);
    if (!verdict.allowed) {
      return rateLimitedResponse(
        "Trop de requêtes vers l'assistant IA — réessayez dans quelques minutes.",
        verdict.retryAfterSec
      );
    }

    const body = await readJsonBody(request);
    const parsed = chatSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(`Requête invalide — ${zodErrorMessage(parsed.error)}`, 400);
    }

    // Indice de contexte produit (comptes uniquement — jamais de contenu privé injecté).
    const [taskCount, projectCount] = await Promise.all([
      db.task.count({ where: { userId: user.id, status: "en_cours" } }),
      db.project.count({ where: { userId: user.id, status: "actif" } }),
    ]);

    const systemPrompt = [
      CONTEXT_PROMPTS[parsed.data.context ?? "general"],
      `Contexte utilisateur : ${taskCount} tâche(s) en cours, ${projectCount} projet(s) actif(s).`,
      "Tu ne peux pas agir directement sur les données (pas de création/modification) : propose des étapes que l'utilisateur applique lui-même.",
      user.name ? `L'utilisateur s'appelle ${user.name}.` : "",
    ]
      .filter(Boolean)
      .join(" ");

    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        { role: "assistant", content: systemPrompt },
        ...parsed.data.messages.map((message) => ({
          role: message.role,
          content: message.content,
        })),
      ],
      thinking: { type: "disabled" },
    });

    const content = completion.choices[0]?.message?.content?.trim();
    if (!content) {
      return errorResponse("L'assistant IA n'a pas pu générer de réponse", 502);
    }

    return NextResponse.json({
      message: { role: "assistant", content, at: new Date().toISOString() },
      remaining: verdict.remaining,
    });
  } catch (error) {
    console.error("[api/ai/chat] POST :", error);
    return errorResponse("Erreur interne du serveur", 500);
  }
}
