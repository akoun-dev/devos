import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { errorResponse, readJsonBody, zodErrorMessage } from "@/lib/api-helpers";
import { getSessionUser } from "@/lib/auth";
import { serializeAiConversation, serializeAiMessage } from "@/lib/serialize";

export const dynamic = "force-dynamic";

/**
 * GET    /api/ai/conversations/:id — détail + messages (contrat v1.4).
 * PATCH  /api/ai/conversations/:id — renommage.
 * DELETE /api/ai/conversations/:id — suppression (messages en cascade).
 * 404 générique si inexistant ou appartenant à un autre utilisateur.
 */

const renameSchema = z
  .object({
    title: z.string().trim().min(1).max(160),
  })
  .strict();

type RouteContext = { params: Promise<{ id: string }> };

const CONVERSATION_INCLUDE = { _count: { select: { messages: true } } } as const;

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return errorResponse("Authentification requise", 401);
    }
    const { id } = await context.params;
    const conversation = await db.aiConversation.findFirst({
      where: { id, userId: user.id },
      include: CONVERSATION_INCLUDE,
    });
    if (!conversation) {
      return errorResponse("Conversation introuvable", 404);
    }
    const messages = await db.aiMessage.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({
      conversation: serializeAiConversation(conversation),
      messages: messages.map(serializeAiMessage),
    });
  } catch (error) {
    console.error("[api/ai/conversations/:id] GET :", error);
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
    const parsed = renameSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(`Titre invalide — ${zodErrorMessage(parsed.error)}`, 400);
    }
    const existing = await db.aiConversation.findFirst({ where: { id, userId: user.id } });
    if (!existing) {
      return errorResponse("Conversation introuvable", 404);
    }
    const conversation = await db.aiConversation.update({
      where: { id },
      data: { title: parsed.data.title },
      include: CONVERSATION_INCLUDE,
    });
    return NextResponse.json({ conversation: serializeAiConversation(conversation) });
  } catch (error) {
    console.error("[api/ai/conversations/:id] PATCH :", error);
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
    const existing = await db.aiConversation.findFirst({ where: { id, userId: user.id } });
    if (!existing) {
      return errorResponse("Conversation introuvable", 404);
    }
    await db.aiConversation.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[api/ai/conversations/:id] DELETE :", error);
    return errorResponse("Erreur interne du serveur", 500);
  }
}
