import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { readJsonBody, zodErrorMessage } from "@/lib/api-helpers";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("list"), token: z.string().trim().min(1).max(500), query: z.string().trim().max(100).optional(), visibility: z.enum(["all", "public", "private"]).optional() }).strict(),
  z.object({ action: z.literal("import"), token: z.string().trim().min(1).max(500), repositoryId: z.number().int().positive(), name: z.string().trim().min(1).max(120), fullName: z.string().trim().min(1).max(250), htmlUrl: z.string().url().max(500), description: z.string().max(2000).nullable().optional(), defaultBranch: z.string().max(250).nullable().optional(), isPrivate: z.boolean() }).strict(),
]);

type GitHubRepository = {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  private: boolean;
  archived: boolean;
  fork: boolean;
  default_branch: string;
  updated_at: string;
  owner: { login: string };
};

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store, private", Pragma: "no-cache" } });
}

async function githubRequest(token: string): Promise<Response> {
  return fetch("https://api.github.com/user/repos?per_page=100&sort=updated&direction=desc", {
    method: "GET",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "DevOS",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
  });
}

function githubError(status: number) {
  if (status === 401) return json({ error: "Token GitHub invalide ou expiré." }, 401);
  if (status === 403 || status === 429) return json({ error: "Accès limité par GitHub. Vérifiez les autorisations du token et réessayez plus tard." }, 429);
  return json({ error: "GitHub est temporairement indisponible." }, 502);
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser().catch(() => null);
  if (!user) return json({ error: "Authentification requise." }, 401);

  const body = await readJsonBody(request);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return json({ error: `Requête invalide — ${zodErrorMessage(parsed.error)}` }, 400);

  const data = parsed.data;
  try {
    const upstream = await githubRequest(data.token);
    if (!upstream.ok) return githubError(upstream.status);

    const repositories = (await upstream.json()) as GitHubRepository[];
    if (!Array.isArray(repositories)) return json({ error: "Réponse GitHub inattendue." }, 502);

    if (data.action === "list") {
      const query = (data.query ?? "").toLocaleLowerCase("fr");
      const filtered = repositories
        .filter((repo) => !repo.archived)
        .filter((repo) => data.visibility === "private" ? repo.private : data.visibility === "public" ? !repo.private : true)
        .filter((repo) => !query || repo.name.toLocaleLowerCase("fr").includes(query) || repo.full_name.toLocaleLowerCase("fr").includes(query) || (repo.description ?? "").toLocaleLowerCase("fr").includes(query))
        .map((repo) => ({
          id: repo.id,
          name: repo.name,
          fullName: repo.full_name,
          htmlUrl: repo.html_url,
          description: repo.description,
          isPrivate: repo.private,
          defaultBranch: repo.default_branch,
          owner: repo.owner.login,
          updatedAt: repo.updated_at,
        }));
      return json({ repositories: filtered });
    }

    const selected = repositories.find((repo) => repo.id === data.repositoryId);
    if (!selected || selected.full_name !== data.fullName || selected.html_url !== data.htmlUrl || selected.private !== data.isPrivate) {
      return json({ error: "Ce dépôt n'est pas accessible avec ce token. Rechargez la liste avant l'import." }, 403);
    }

    const existing = await db.project.findFirst({
      where: { userId: user.id, sourceRepositoryId: String(selected.id) },
      select: { id: true, name: true },
    });
    if (existing) return json({ error: `Ce dépôt est déjà associé au projet « ${existing.name} ».`, projectId: existing.id }, 409);

    const project = await db.project.create({
      data: {
        name: selected.name.slice(0, 120),
        description: selected.description?.slice(0, 2000) ?? `Dépôt GitHub : ${selected.full_name}`,
        status: "actif",
        priority: "normale",
        userId: user.id,
        sourceProvider: "github",
        sourceRepositoryId: String(selected.id),
        sourceRepositoryUrl: selected.html_url,
        sourceDefaultBranch: selected.default_branch || null,
      },
      select: { id: true, name: true, sourceRepositoryUrl: true, sourceDefaultBranch: true },
    });
    return json({ project }, 201);
  } catch {
    // Ne jamais journaliser l'objet erreur : il peut contenir des détails upstream.
    return json({ error: "Impossible de joindre GitHub pour le moment." }, 502);
  }
}
