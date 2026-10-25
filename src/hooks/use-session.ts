'use client'

/**
 * useSession — état de session côté client (FEATURE-AUTH).
 * - charge /api/auth/me au montage (`loading` tant que la session n'est pas résolue) ;
 * - login / register appellent les endpoints, mettent à jour l'état et RENVOIENT
 *   l'utilisateur (les erreurs serveur remontent à l'appelant via ApiError) ;
 * - logout appelle /api/auth/logout puis vide l'état local ;
 * - signOutLocal ferme la session côté client uniquement (401 = session expirée).
 * Fetch relatif UNIQUEMENT. La session vit dans un cookie httpOnly : aucun jeton
 * n'est jamais exposé au JavaScript.
 */

import { useCallback, useEffect, useState } from 'react'

import { apiFetch } from '@/lib/assistant/api'
import type { AuthUser } from '@/types/assistant'

interface AuthResponse {
  user: AuthUser
}

export function useSession() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const data = await apiFetch<AuthResponse>('/api/auth/me')
      setUser(data.user)
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const login = useCallback(async (email: string, password: string): Promise<AuthUser> => {
    const data = await apiFetch<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    setUser(data.user)
    return data.user
  }, [])

  const register = useCallback(
    async (name: string, email: string, password: string): Promise<AuthUser> => {
      const trimmedName = name.trim()
      const data = await apiFetch<AuthResponse>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email,
          password,
          ...(trimmedName ? { name: trimmedName } : {}),
        }),
      })
      setUser(data.user)
      return data.user
    },
    [],
  )

  const logout = useCallback(async () => {
    try {
      await apiFetch<{ ok: boolean }>('/api/auth/logout', { method: 'POST' })
    } finally {
      setUser(null)
    }
  }, [])

  /** Déconnexion locale uniquement (session expirée détectée côté serveur). */
  const signOutLocal = useCallback(() => {
    setUser(null)
  }, [])

  return { user, loading, login, register, logout, signOutLocal }
}
