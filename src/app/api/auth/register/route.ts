import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";

import { errorResponse, readJsonBody, zodErrorMessage } from "@/lib/api-helpers";
import { hashPassword, sessionCookieOptions, SESSION_COOKIE_NAME, signSessionToken } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Email normalisé (trim + minuscules) — regex volontairement simple et stricte. */
const registerSchema = z
  .object({
    email: z
      .string()
      .trim()
      .toLowerCase()
      .min(3)
      .max(254)
      .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Format d'email invalide"),
    password: z.string().min(8, "8 caractères minimum").max(72, "72 caractères maximum"),
    name: z.string().trim().min(1).max(80).optional(),
  })
  .strict();

/** POST /api/auth/register — création de compte + session immédiate (201). */
export async function POST(request: NextRequest) {
  try {
    const body = await readJsonBody(request);
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(`Inscription invalide — ${zodErrorMessage(parsed.error)}`, 400);
    }
    const { email, password, name } = parsed.data;

    const existing = await db.user.findUnique({ where: { email }, select: { id: true } });
    if (existing) {
      return errorResponse("Un compte existe déjà avec cet email.", 409);
    }

    const passwordHash = await hashPassword(password);
    const user = await db.user.create({
      data: { email, passwordHash, name: name ?? null },
      select: { id: true, email: true, name: true },
    });

    const token = await signSessionToken(user.id);
    const response = NextResponse.json({ user }, { status: 201 });
    response.cookies.set(SESSION_COOKIE_NAME, token, sessionCookieOptions());
    return response;
  } catch (error) {
    // Course concurrente sur l'unicité de l'email (contrainte @unique).
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return errorResponse("Un compte existe déjà avec cet email.", 409);
    }
    console.error("[api/auth/register] POST :", error);
    return errorResponse("Erreur interne du serveur", 500);
  }
}
