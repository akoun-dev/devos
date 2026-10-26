/// <reference types="bun-types" />
import { beforeEach, describe, expect, mock, test } from "bun:test";
import { NextRequest } from "next/server";

const findFirst = mock(async () => null as { id: string; name: string } | null);
const createProject = mock(async ({ data }: { data: Record<string, unknown> }) => ({
  id: "project-created",
  name: String(data.name),
  sourceRepositoryUrl: data.sourceRepositoryUrl,
  sourceDefaultBranch: data.sourceDefaultBranch,
}));

let sessionUser: { id: string; email: string; name: string | null } | null = {
  id: "user-test",
  email: "test@example.invalid",
  name: "Test",
};
let upstreamResponse: Response;

mock.module("@/lib/auth", () => ({
  getSessionUser: mock(async () => sessionUser),
}));

mock.module("@/lib/db", () => ({
  db: {
    project: {
      findFirst,
      create: createProject,
    },
  },
}));

const { POST } = await import("@/app/api/github/repositories/route");

const repo = {
  id: 90210,
  name: "private-demo",
  full_name: "test-owner/private-demo",
  html_url: "https://github.com/test-owner/private-demo",
  description: "Private test repository",
  private: true,
  archived: false,
  fork: false,
  default_branch: "main",
  updated_at: "2026-10-26T10:00:00Z",
  owner: { login: "test-owner" },
};

function request(body: unknown) {
  return new NextRequest("http://localhost/api/github/repositories", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/github/repositories", () => {
  beforeEach(() => {
    sessionUser = { id: "user-test", email: "test@example.invalid", name: "Test" };
    findFirst.mockReset();
    findFirst.mockResolvedValue(null);
    createProject.mockReset();
    createProject.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      id: "project-created",
      name: String(data.name),
      sourceRepositoryUrl: data.sourceRepositoryUrl,
      sourceDefaultBranch: data.sourceDefaultBranch,
    }));
    upstreamResponse = new Response(JSON.stringify([repo]), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
    globalThis.fetch = mock(async () => upstreamResponse) as typeof fetch;
  });

  test("rejects unauthenticated callers without sending the token to GitHub", async () => {
    sessionUser = null;
    const response = await POST(request({ action: "list", token: "test-token" }));
    expect(response.status).toBe(401);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  test("maps an invalid or expired GitHub token to 401", async () => {
    upstreamResponse = new Response(JSON.stringify({ message: "Bad credentials" }), { status: 401 });
    const response = await POST(request({ action: "list", token: "invalid-token" }));
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ error: "Token GitHub invalide ou expiré." });
  });

  test("lists private repositories granted by the submitted token", async () => {
    const response = await POST(request({ action: "list", token: "test-token", visibility: "private" }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      repositories: [{ id: 90210, fullName: "test-owner/private-demo", isPrivate: true }],
    });
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  test("maps GitHub permission/rate-limit responses to a retryable 429", async () => {
    upstreamResponse = new Response(JSON.stringify({ message: "API rate limit exceeded" }), { status: 403 });
    const response = await POST(request({ action: "list", token: "test-token" }));
    expect(response.status).toBe(429);
  });

  test("imports only a repository verified against the token's accessible repository list", async () => {
    const response = await POST(request({
      action: "import",
      token: "test-token",
      repositoryId: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      htmlUrl: repo.html_url,
      description: repo.description,
      defaultBranch: repo.default_branch,
      isPrivate: true,
    }));
    expect(response.status).toBe(201);
    expect(createProject).toHaveBeenCalledTimes(1);
    expect(createProject).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        userId: "user-test",
        sourceProvider: "github",
        sourceRepositoryId: "90210",
        sourceRepositoryUrl: repo.html_url,
      }),
    }));
  });

  test("refuses a forged repository selection that is not in the token's accessible list", async () => {
    const response = await POST(request({
      action: "import",
      token: "test-token",
      repositoryId: 123,
      name: "forged",
      fullName: "attacker/forged",
      htmlUrl: "https://github.com/attacker/forged",
      isPrivate: false,
    }));
    expect(response.status).toBe(403);
    expect(createProject).not.toHaveBeenCalled();
  });

  test("returns conflict when the same repository was already imported by this user", async () => {
    findFirst.mockResolvedValue({ id: "existing-project", name: "private-demo" });
    const response = await POST(request({
      action: "import",
      token: "test-token",
      repositoryId: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      htmlUrl: repo.html_url,
      description: repo.description,
      defaultBranch: repo.default_branch,
      isPrivate: true,
    }));
    expect(response.status).toBe(409);
    expect(createProject).not.toHaveBeenCalled();
  });
});
