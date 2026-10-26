import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { errorResponse, readJsonBody, zodErrorMessage } from "@/lib/api-helpers";
import { getSessionUser } from "@/lib/auth";
import { serializeTask } from "@/lib/serialize";

export const dynamic = "force-dynamic";

const TASK_STATUSES = ["en_cours", "terminee", "annulee"] as const;
const PRIORITIES = ["basse", "normale", "haute", "urgente"] as const;

const createTaskSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    description: z.string().max(2000).nullable().optional(),
    category: z.string().trim().max(50).optional(),
    priority: z.enum(PRIORITIES).optional(),
    dueAt: z.iso.datetime({ offset: true }).nullable().optional(),
    reminderOffsetMinutes: z.number().int().min(1).max(10080).nullable().optional(),
    reminderEnabled: z.boolean().optional(),
    projectId: z.string().trim().max(64).nullable().optional(),
  })
  .strict();

const taskQuerySchema = z
  .object({
    status: z.enum(TASK_STATUSES).optional(),
    category: z.string().trim().max(50).optional(),
  })
  .strict();

/** GET /api/tasks?status=&category= — tri dueAt asc (nulls en dernier) puis createdAt desc. Scopé à l'utilisateur connecté. */
export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return errorResponse("Authentification requise", 401);
    }
    const params = request.nextUrl.searchParams;
    const parsedQuery = taskQuerySchema.safeParse({
      status: params.get("status") ?? undefined,
      category: params.get("category") ?? undefined,
    });
    if (!parsedQuery.success) {
      return errorResponse(`Requête invalide — ${zodErrorMessage(parsedQuery.error)}`, 400);
    }
    const { status, category } = parsedQuery.data;
    const tasks = await db.task.findMany({
      where: {
        userId: user.id,
        ...(status ? { status } : {}),
        ...(category ? { category } : {}),
      },
      include: { project: { select: { name: true } } },
    });

    // dueAt asc avec nulls en DERNIER, puis createdAt desc (contrat v1).
    tasks.sort((a, b) => {
      if (a.dueAt && b.dueAt) {
        return a.dueAt.getTime() - b.dueAt.getTime() || b.createdAt.getTime() - a.createdAt.getTime();
      }
      if (a.dueAt) return -1;
      if (b.dueAt) return 1;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });

    return NextResponse.json({ tasks: tasks.map(serializeTask) });
  } catch (error) {
    console.error("[api/tasks] GET :", error);
    return errorResponse("Erreur interne du serveur", 500);
  }
}

/** POST /api/tasks — création (201), rattachée à l'utilisateur connecté. */
export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return errorResponse("Authentification requise", 401);
    }
    const body = await readJsonBody(request);
    const parsed = createTaskSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(`Tâche invalide — ${zodErrorMessage(parsed.error)}`, 400);
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
    const task = await db.task.create({
      data: {
        title: data.title,
        description: data.description ?? null,
        category: data.category ?? "general",
        priority: data.priority ?? "normale",
        dueAt: data.dueAt ? new Date(data.dueAt) : null,
        reminderOffsetMinutes: data.reminderOffsetMinutes ?? null,
        reminderEnabled: data.reminderEnabled ?? true,
        projectId: data.projectId ?? null,
        userId: user.id,
      },
      include: { project: { select: { name: true } } },
    });
    return NextResponse.json({ task: serializeTask(task) }, { status: 201 });
  } catch (error) {
    console.error("[api/tasks] POST :", error);
    return errorResponse("Erreur interne du serveur", 500);
  }
}
