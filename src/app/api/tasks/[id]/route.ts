import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { errorResponse, readJsonBody, zodErrorMessage } from "@/lib/api-helpers";
import { serializeTask } from "@/lib/serialize";

export const dynamic = "force-dynamic";

const patchTaskSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    description: z.string().max(2000).nullable(),
    category: z.string().trim().max(50),
    priority: z.enum(["basse", "normale", "haute", "urgente"]),
    status: z.enum(["en_cours", "terminee", "annulee"]),
    dueAt: z.iso.datetime({ offset: true }).nullable(),
    reminderOffsetMinutes: z.number().int().min(1).max(10080).nullable(),
    reminderEnabled: z.boolean(),
  })
  .strict()
  .partial();

type RouteContext = { params: Promise<{ id: string }> };

/** PATCH /api/tasks/[id] — mise à jour partielle (statut ∈ en_cours|terminee|annulee). */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await readJsonBody(request);
    const parsed = patchTaskSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(`Mise à jour invalide — ${zodErrorMessage(parsed.error)}`, 400);
    }
    if (Object.keys(parsed.data).length === 0) {
      return errorResponse("Aucun champ fourni", 400);
    }
    const existing = await db.task.findUnique({ where: { id } });
    if (!existing) {
      return errorResponse("Tâche introuvable", 404);
    }
    const data = parsed.data;
    const task = await db.task.update({
      where: { id },
      data: {
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.category !== undefined ? { category: data.category } : {}),
        ...(data.priority !== undefined ? { priority: data.priority } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.dueAt !== undefined ? { dueAt: data.dueAt ? new Date(data.dueAt) : null } : {}),
        ...(data.reminderOffsetMinutes !== undefined
          ? { reminderOffsetMinutes: data.reminderOffsetMinutes }
          : {}),
        ...(data.reminderEnabled !== undefined ? { reminderEnabled: data.reminderEnabled } : {}),
      },
    });
    // status terminee/annulee ⇒ plus AUCUNE annonce future (état dérivé, AC-007).
    return NextResponse.json({ task: serializeTask(task) });
  } catch (error) {
    console.error("[api/tasks/[id]] PATCH :", error);
    return errorResponse("Erreur interne du serveur", 500);
  }
}

/** DELETE /api/tasks/[id] — suppression (les ReminderLog liés sont supprimés en cascade). */
export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const existing = await db.task.findUnique({ where: { id } });
    if (!existing) {
      return errorResponse("Tâche introuvable", 404);
    }
    await db.task.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[api/tasks/[id]] DELETE :", error);
    return errorResponse("Erreur interne du serveur", 500);
  }
}
