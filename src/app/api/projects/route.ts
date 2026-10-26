import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { errorResponse, readJsonBody, zodErrorMessage } from "@/lib/api-helpers";
import { getSessionUser } from "@/lib/auth";
import { serializeProject } from "@/lib/serialize";

export const dynamic = "force-dynamic";

const PROJECT_STATUSES = ["actif", "en_pause", "termine", "archive"] as const;
const PRIORITIES = ["basse", "normale", "haute", "urgente"] as const;

const createProjectSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    description: z.string().max(2000).nullable().optional(),
    status: z.enum(PROJECT_STATUSES).optional(),
    priority: z.enum(PRIORITIES).optional(),
    favorite: z.boolean().optional(),
    color: z.string().trim().max(20).nullable().optional(),
    dueAt: z.iso.datetime({ offset: true }).nullable().optional(),
  })
  .strict();

const projectQuerySchema = z
  .object({ status: z.enum(PROJECT_STATUSES).optional() })
  .strict();

const PROJECT_INCLUDE = { _count: { select: { tasks: true } } } as const;

/** Compteur de tâches terminées par projet (groupBy — pas d'alias filtré dans _count). */
async function doneTaskCounts(userId: string): Promise<Map<string, number>> {
  const grouped = await db.task.groupBy({
    by: ["projectId"],
    where: { userId, status: "terminee", projectId: { not: null } },
    _count: { _all: true },
  });
  return new Map(grouped.map((row) => [row.projectId ?? "", row._count._all]));
}

/** GET /api/projects?status= — tri favorite desc, updatedAt desc. Scopé utilisateur. */
export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return errorResponse("Authentification requise", 401);
    }
    const parsedQuery = projectQuerySchema.safeParse({
      status: request.nextUrl.searchParams.get("status") ?? undefined,
    });
    if (!parsedQuery.success) {
      return errorResponse(`Requête invalide — ${zodErrorMessage(parsedQuery.error)}`, 400);
    }
    const { status } = parsedQuery.data;
    const projects = await db.project.findMany({
      where: { userId: user.id, ...(status ? { status } : {}) },
      include: PROJECT_INCLUDE,
    });
    const doneCounts = await doneTaskCounts(user.id);
    // favorite d'abord, puis updatedAt desc.
    projects.sort(
      (a, b) =>
        Number(b.favorite) - Number(a.favorite) ||
        b.updatedAt.getTime() - a.updatedAt.getTime()
    );
    return NextResponse.json({ projects: projects.map((p) => serializeProject(p, doneCounts.get(p.id) ?? 0)) });
  } catch (error) {
    console.error("[api/projects] GET :", error);
    return errorResponse("Erreur interne du serveur", 500);
  }
}

/** POST /api/projects — création (201). */
export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return errorResponse("Authentification requise", 401);
    }
    const body = await readJsonBody(request);
    const parsed = createProjectSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(`Projet invalide — ${zodErrorMessage(parsed.error)}`, 400);
    }
    const data = parsed.data;
    const project = await db.project.create({
      data: {
        name: data.name,
        description: data.description ?? null,
        status: data.status ?? "actif",
        priority: data.priority ?? "normale",
        favorite: data.favorite ?? false,
        color: data.color ?? null,
        dueAt: data.dueAt ? new Date(data.dueAt) : null,
        userId: user.id,
      },
      include: PROJECT_INCLUDE,
    });
    return NextResponse.json({ project: serializeProject(project, 0) }, { status: 201 });
  } catch (error) {
    console.error("[api/projects] POST :", error);
    return errorResponse("Erreur interne du serveur", 500);
  }
}
