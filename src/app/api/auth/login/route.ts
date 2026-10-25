import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { errorResponse, readJsonBody, zodErrorMessage } from "@/lib/api-helpers";
import {
  dummyPasswordCheck,
  sessionCookieOptions,
  SESSION_COOKIE_NAME,
  signSessionToken,
  verifyPassword,
} from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const loginSchema = z
  .object({
    email: z.string().trim().toLowerCase().min(3).max(254),
    password: z.string().min(1).max(72),
  })
  .strict();

/**
 * POST /api/auth/login — vérifie les identifiants et pose le cookie de session.
 * Message d'erreur VOLONTAIREMENT générique (pas de divulgation d'existence de
 * compte) + égalisation temporelle bcrypt si l'email est inconnu.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await readJsonBody(request);
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(`Connexion invalide — ${zodErrorMessage(parsed.error)}`, 400);
    }
    const { email, password } = parsed.data;

    const user = await db.user.findUnique({ where: { email } });
    let valid = false;
    if (user) {
      valid = await verifyPassword(password, user.passwordHash);
    } else {
      // Email inconnu : comparaison bcrypt factice pour égaliser le temps de réponse.
      await dummyPasswordCheck(password);
    }

    if (!user || !valid) {
      return errorResponse("Email ou mot de passe incorrect.", 401);
    }

    const token = await signSessionToken(user.id);
    const response = NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name },
    });
    response.cookies.set(SESSION_COOKIE_NAME, token, sessionCookieOptions());
    return response;
  } catch (error) {
    console.error("[api/auth/login] POST :", error);
    return errorResponse("Erreur interne du serveur", 500);
  }
}
