/**
 * auth.ts — noyau du système d'authentification DevOS (FEATURE-AUTH, ADR-003).
 *
 * Choix techniques :
 *  - next-auth PROHIBÉ (vulnérabilité critique, retiré en DEBT-016) → session JWT maison ;
 *  - mots de passe : bcryptjs (coût 10, hachage natif JS sans binaire) ;
 *  - jeton : JWT HS256 signé via `jose` (subject = user id, TTL 7 jours) ;
 *  - transport : cookie httpOnly + SameSite=Lax (+ Secure en production), PAS de
 *    middleware — contrôle d'accès effectué route par route (posture AUDIT-002 :
 *    surface d'attaque next middleware maintenue à zéro).
 *
 * RÈGLE : ce module est SERVEUR UNIQUEMENT (secret JWT + bcrypt). Ne jamais
 * l'importer depuis un composant client.
 */

import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";

import { db } from "@/lib/db";

export const SESSION_COOKIE_NAME = "devos_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 jours
const BCRYPT_COST = 10;

/**
 * Hash bcrypt factice précalculé (mot de passe aléatoire) : permet, lors d'une
 * connexion avec email inconnu, d'exécuter quand même une comparaison bcrypt
 * afin d'égaliser le temps de réponse et neutraliser l'oracle temporel.
 */
const DUMMY_BCRYPT_HASH = "$2b$10$LvnIQVo.7rTzB8SWxmfCaekUZaXidSXxhM//XmJuppOKVV3AEVEXa";

function getSessionSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET manquant ou trop court (32 caractères minimum requis)");
  }
  return new TextEncoder().encode(secret);
}

// ─── Mots de passe ───────────────────────────────────────────────────────────

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_COST);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/** Comparaison jetable pour égaliser le temps de réponse (email inconnu). */
export async function dummyPasswordCheck(password: string): Promise<void> {
  try {
    await bcrypt.compare(password, DUMMY_BCRYPT_HASH);
  } catch {
    // hash factice invalide dans un environnement exotique : l'égalisation est
    // une défense en profondeur, ne JAMAIS faire échouer la requête pour cela.
  }
}

// ─── Jeton de session (JWT HS256) ────────────────────────────────────────────

export async function signSessionToken(userId: string): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSessionSecret());
}

/** Vérifie le jeton et renvoie le user id, ou null si invalide/expiré. */
export async function verifySessionToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, getSessionSecret(), { algorithms: ["HS256"] });
    const sub = payload.sub;
    return typeof sub === "string" && sub.length > 0 ? sub : null;
  } catch {
    return null;
  }
}

// ─── Session courante ────────────────────────────────────────────────────────

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
}

/**
 * Utilisateur de la session courante (lecture du cookie httpOnly), ou null.
 * Utilisable dans les Route Handlers et Server Components.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  const userId = await verifySessionToken(token);
  if (!userId) return null;
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true },
  });
  return user;
}

/** Options du cookie de session (httpOnly, SameSite=Lax, Secure si prod). */
export function sessionCookieOptions(maxAge: number = SESSION_TTL_SECONDS) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

export { SESSION_TTL_SECONDS };
