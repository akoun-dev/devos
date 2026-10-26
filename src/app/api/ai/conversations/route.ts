import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { errorResponse, readJsonBody, zodErrorMessage } from "@/lib/api-helpers";
import { getSessionUser } from "@/lib/auth";
import { serializeAiConversation } from "@/lib/serialize";

export const dynamic = "force-dynamic";

/**
 * GET  /api/ai/conversations — liste des conversations IA (contrat v1.4).
 * POST /api/ai/conversations — création d'une conversation vide.
 * Scopage strict userId ; tri updatedAt desc ; limite 1..50 (défaut 30).
 */

const createConversationSchema = z
  .object({
    title: z.string().trim().min(1).max(160).optional(),
    context: z.enum(["general", "dev", "planification"]).optional(),
  })
  .strict();

const listSchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(50).optional(),
  })
  .strict();

const CONVERSATION_INCLUDE = { _count: { select: { messages: true } } } as const;

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return errorResponse("Authentification requise", 401);
    }
    const url = new URL(request.url);
    const rawLimit = url.searchParams.get("limit");
    const parsed = listSchema.safeParse(rawLimit === null ? {} : { limit: rawLimit });
    if (!parsed.success) {
      return errorResponse(`Requête invalide — ${zodErrorMessage(parsed.error)}`, 400);
    }
    const conversations = await db.aiConversation.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      take: parsed.data.limit ?? 30,
      include: CONVERSATION_INCLUDE,
    });
    return NextResponse.json({ conversations: conversations.map(serializeAiConversation) });
  } catch (error) {
    console.error("[api/ai/conversations] GET :", error);
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
    const parsed = createConversationSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(`Conversation invalide — ${zodErrorMessage(parsed.error)}`, 400);
    }
    const conversation = await db.aiConversation.create({
      data: {
        userId: user.id,
        ...(parsed.data.title ? { title: parsed.data.title } : {}),
        ...(parsed.data.context ? { context: parsed.data.context } : {}),
      },
      include: CONVERSATION_INCLUDE,
    });
    return NextResponse.json({ conversation: serializeAiConversation(conversation) }, { status: 201 });
  } catch (error) {
    console.error("[api/ai/conversations] POST :", error);
    return errorResponse("Erreur interne du serveur", 500);
  }
}
