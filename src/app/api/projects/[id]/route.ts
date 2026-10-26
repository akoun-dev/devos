import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { errorResponse, readJsonBody, zodErrorMessage } from "@/lib/api-helpers";
import { getSessionUser } from "@/lib/auth";
import { serializeProject } from "@/lib/serialize";

export const dynamic = "force-dynamic";

const PROJECT_STATUSES = ["actif", "en_pause", "termine", "archive"] as const;
const PRIORITIES = ["basse", "normale", "haute", "urgente"] as const;

const updateProjectSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    description: z.string().max(2000).nullable().optional(),
    status: z.enum(PROJECT_STATUSES).optional(),
    priority: z.enum(PRIORITIES).optional(),
    favorite: z.boolean().optional(),
    color: z.string().trim().max(20).nullable().optional(),
    dueAt: z.iso.datetime({ offset: true }).nullable().optional(),
  })
  .strict();

type RouteContext = { params: Promise<{ id: string }> };

const PROJECT_INCLUDE = { _count: { select: { tasks: true } } } as const;

/** GET /api/projects/:id — 404 générique si inexistant ou d'un autre utilisateur. */
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return errorResponse("Authentification requise", 401);
    }
    const { id } = await context.params;
    const project = await db.project.findFirst({
      where: { id, userId: user.id },
      include: PROJECT_INCLUDE,
    });
    if (!project) {
      return errorResponse("Projet introuvable", 404);
    }
    const doneCount = await db.task.count({ where: { projectId: id, userId: user.id, status: "terminee" } });
    return NextResponse.json({ project: serializeProject(project, doneCount) });
  } catch (error) {
    console.error("[api/projects/:id] GET :", error);
    return errorResponse("Erreur interne du serveur", 500);
  }
}

/** PATCH /api/projects/:id — mise à jour partielle. */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return errorResponse("Authentification requise", 401);
    }
    const { id } = await context.params;
    const body = await readJsonBody(request);
    const parsed = updateProjectSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(`Projet invalide — ${zodErrorMessage(parsed.error)}`, 400);
    }
    const existing = await db.project.findFirst({ where: { id, userId: user.id } });
    if (!existing) {
      return errorResponse("Projet introuvable", 404);
    }
    const data = parsed.data;
    const project = await db.project.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.priority !== undefined ? { priority: data.priority } : {}),
        ...(data.favorite !== undefined ? { favorite: data.favorite } : {}),
        ...(data.color !== undefined ? { color: data.color } : {}),
        ...(data.dueAt !== undefined ? { dueAt: data.dueAt ? new Date(data.dueAt) : null } : {}),
      },
      include: PROJECT_INCLUDE,
    });
    const doneCount = await db.task.count({ where: { projectId: id, userId: user.id, status: "terminee" } });
    return NextResponse.json({ project: serializeProject(project, doneCount) });
  } catch (error) {
    console.error("[api/projects/:id] PATCH :", error);
    return errorResponse("Erreur interne du serveur", 500);
  }
}

/** DELETE /api/projects/:id — suppression (tâches/notes détachées : projectId → null). */
export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return errorResponse("Authentification requise", 401);
    }
    const { id } = await context.params;
    const existing = await db.project.findFirst({ where: { id, userId: user.id } });
    if (!existing) {
      return errorResponse("Projet introuvable", 404);
    }
    await db.project.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[api/projects/:id] DELETE :", error);
    return errorResponse("Erreur interne du serveur", 500);
  }
}
