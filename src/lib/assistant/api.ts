/**
 * Client HTTP minimal pour les endpoints du contrat API v1 (cf. .ai/API_CONTRACTS.md).
 * RÈGLE : fetch relatif UNIQUEMENT (jamais d'URL absolue / localhost).
 * Erreurs uniformes côté serveur : { error: string }.
 */

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

/** GET/POST/PUT/PATCH/DELETE JSON avec gestion d'erreur uniforme. */
export async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(url, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
    })
  } catch {
    throw new ApiError(0, 'Serveur injoignable — vérifiez votre connexion.')
  }

  const payload: unknown = await response.json().catch(() => null)

  if (!response.ok) {
    const message =
      payload !== null &&
      typeof payload === 'object' &&
      'error' in payload &&
      typeof (payload as { error: unknown }).error === 'string'
        ? (payload as { error: string }).error
        : `Erreur ${response.status}`
    throw new ApiError(response.status, message)
  }

  return payload as T
}
