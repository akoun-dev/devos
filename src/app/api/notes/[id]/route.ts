import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { errorResponse, readJsonBody, zodErrorMessage } from "@/lib/api-helpers";
import { getSessionUser } from "@/lib/auth";
import { serializeNote } from "@/lib/serialize";

export const dynamic = "force-dynamic";

const updateNoteSchema = z
  .object({
    title: z.string().trim().min(1).max(160).optional(),
    content: z.string().max(50_000).optional(),
    favorite: z.boolean().optional(),
    trashed: z.boolean().optional(),
    projectId: z.string().trim().min(1).max(64).nullable().optional(),
  })
  .strict();

type RouteContext = { params: Promise<{ id: string }> };

const NOTE_INCLUDE = { project: { select: { name: true } } } as const;

/** GET /api/notes/:id — 404 générique si inexistant ou d'un autre utilisateur. */
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return errorResponse("Authentification requise", 401);
    }
    const { id } = await context.params;
    const note = await db.note.findFirst({ where: { id, userId: user.id }, include: NOTE_INCLUDE });
    if (!note) {
      return errorResponse("Note introuvable", 404);
    }
    return NextResponse.json({ note: serializeNote(note) });
  } catch (error) {
    console.error("[api/notes/:id] GET :", error);
    return errorResponse("Erreur interne du serveur", 500);
  }
}

/** PATCH /api/notes/:id — mise à jour partielle (contenu, favori, corbeille, projet). */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return errorResponse("Authentification requise", 401);
    }
    const { id } = await context.params;
    const body = await readJsonBody(request);
    const parsed = updateNoteSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(`Note invalide — ${zodErrorMessage(parsed.error)}`, 400);
    }
    const data = parsed.data;
    if (data.projectId) {
      const project = await db.project.findFirst({
        where: { id: data.projectId, userId: user.id },
      });
      if (!project) {
        return errorResponse("Projet introuvable", 404);
      }
    }
    const existing = await db.note.findFirst({ where: { id, userId: user.id } });
    if (!existing) {
      return errorResponse("Note introuvable", 404);
    }
    const note = await db.note.update({
      where: { id },
      data: {
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.content !== undefined ? { content: data.content } : {}),
        ...(data.favorite !== undefined ? { favorite: data.favorite } : {}),
        ...(data.trashed !== undefined ? { trashed: data.trashed } : {}),
        ...(data.projectId !== undefined ? { projectId: data.projectId } : {}),
      },
      include: NOTE_INCLUDE,
    });
    return NextResponse.json({ note: serializeNote(note) });
  } catch (error) {
    console.error("[api/notes/:id] PATCH :", error);
    return errorResponse("Erreur interne du serveur", 500);
  }
}

/** DELETE /api/notes/:id — suppression définitive (depuis la corbeille). */
export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return errorResponse("Authentification requise", 401);
    }
    const { id } = await context.params;
    const existing = await db.note.findFirst({ where: { id, userId: user.id } });
    if (!existing) {
      return errorResponse("Note introuvable", 404);
    }
    await db.note.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[api/notes/:id] DELETE :", error);
    return errorResponse("Erreur interne du serveur", 500);
  }
}
