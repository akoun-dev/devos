import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { errorResponse, readJsonBody, zodErrorMessage } from "@/lib/api-helpers";
import { getSessionUser } from "@/lib/auth";
import { serializeNote } from "@/lib/serialize";

export const dynamic = "force-dynamic";

const createNoteSchema = z
  .object({
    title: z.string().trim().min(1).max(160),
    content: z.string().max(50_000).nullable().optional(),
    projectId: z.string().trim().min(1).max(64).nullable().optional(),
    favorite: z.boolean().optional(),
  })
  .strict();

const noteQuerySchema = z
  .object({
    projectId: z.string().trim().max(64).optional(),
    trashed: z.enum(["true", "false"]).optional(),
  })
  .strict();

/** GET /api/notes?projectId=&trashed= — tri favorite desc, updatedAt desc. Scopé utilisateur. */
export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return errorResponse("Authentification requise", 401);
    }
    const params = request.nextUrl.searchParams;
    const parsedQuery = noteQuerySchema.safeParse({
      projectId: params.get("projectId") ?? undefined,
      trashed: params.get("trashed") ?? undefined,
    });
    if (!parsedQuery.success) {
      return errorResponse(`Requête invalide — ${zodErrorMessage(parsedQuery.error)}`, 400);
    }
    const { projectId, trashed } = parsedQuery.data;
    const notes = await db.note.findMany({
      where: {
        userId: user.id,
        ...(projectId ? { projectId } : {}),
        ...(trashed !== undefined ? { trashed: trashed === "true" } : {}),
      },
      include: { project: { select: { name: true } } },
    });
    notes.sort(
      (a, b) =>
        Number(b.favorite) - Number(a.favorite) ||
        b.updatedAt.getTime() - a.updatedAt.getTime()
    );
    return NextResponse.json({ notes: notes.map(serializeNote) });
  } catch (error) {
    console.error("[api/notes] GET :", error);
    return errorResponse("Erreur interne du serveur", 500);
  }
}

/** POST /api/notes — création (201). Le projet éventuel doit appartenir à l'utilisateur. */
export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return errorResponse("Authentification requise", 401);
    }
    const body = await readJsonBody(request);
    const parsed = createNoteSchema.safeParse(body);
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
    const note = await db.note.create({
      data: {
        title: data.title,
        content: data.content ?? "",
        favorite: data.favorite ?? false,
        projectId: data.projectId ?? null,
        userId: user.id,
      },
      include: { project: { select: { name: true } } },
    });
    return NextResponse.json({ note: serializeNote(note) }, { status: 201 });
  } catch (error) {
    console.error("[api/notes] POST :", error);
    return errorResponse("Erreur interne du serveur", 500);
  }
}
