/**
 * api-helpers.ts — réponses d'erreur uniformes { error } (contrat API v1).
 */

import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function errorResponse(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

/** Réponse 429 uniforme ({ error }) + en-tête Retry-After (DEBT-021, rate limiting). */
export function rateLimitedResponse(message: string, retryAfterSec: number): NextResponse {
  const response = errorResponse(message, 429);
  response.headers.set("Retry-After", String(Math.max(1, Math.ceil(retryAfterSec))));
  return response;
}

export function zodErrorMessage(error: ZodError): string {
  return (
    error.issues
      .map((issue) => `${issue.path.join(".") || "payload"} : ${issue.message}`)
      .join(" ; ") || "Payload invalide"
  );
}

/** Lit le corps JSON d'une requête ; corps absent/illisible → {}. */
export async function readJsonBody(request: Request): Promise<unknown> {
  try {
    const text = await request.text();
    if (!text.trim()) return {};
    return JSON.parse(text);
  } catch {
    return null; // JSON présent mais invalide → sera rejeté par Zod
  }
}
