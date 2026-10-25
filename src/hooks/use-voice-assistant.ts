'use client'

/**
 * Cœur client de DevOS (FEATURE-001) :
 * - charge les préférences vocales (GET, fallback localStorage `devos-voice-prefs`) ;
 * - boucle de tick : POST /api/assistant/tick toutes les 30 s + tick immédiat au montage ;
 * - prononce les annonces (spoken=true) via Web Speech, notifie (muette si spoken=false),
 *   ajoute au journal (max 50) avec dédoublonnage par announcement.id ;
 * - expose savePrefs (PUT + miroir localStorage + toast), speakTest, snooze,
 *   refreshTasks (GET /api/tasks) et tickNow.
 * Fetch relatif UNIQUEMENT. Aucune URL absolue.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useToast } from '@/hooks/use-toast'
import { ApiError, apiFetch } from '@/lib/assistant/api'
import { formatTimeFR } from '@/lib/assistant/format'
import { notify } from '@/lib/assistant/notifications'
import { isSpeechSynthesisSupported, speak } from '@/lib/assistant/tts'
import type {
  Announcement,
  Task,
  TestVoiceResponse,
  TickResponse,
  VoicePreferences,
} from '@/types/assistant'

export const PREFS_STORAGE_KEY = 'devos-voice-prefs'
const JOURNAL_LIMIT = 50
const TICK_INTERVAL_MS = 30_000

/** Entrée du journal des annonces (côté client). */
export interface JournalEntry {
  announcement: Announcement
  /** heure de réception locale (ISO) */
  receivedAt: string
}

/** Dernier état connu du serveur (tick). */
export interface ServerTickInfo {
  /** now renvoyé par le serveur (ISO) */
  now: string | null
  quietHours: TickResponse['quietHours'] | null
  /** heure locale du dernier tick tenté (ISO) */
  at: string | null
  ok: boolean
}

/** Valeurs par défaut du contrat v1 (fallback hors-ligne / avant 1er GET). */
export const DEFAULT_VOICE_PREFERENCES: VoicePreferences = {
  enabled: true,
  reminderOffsetMinutes: 60,
  announceNewTasks: true,
  announceDeadlines: true,
  announcePriorities: true,
  // Aligné sur le défaut serveur Prisma (FR-007 : heures silencieuses activées par défaut) — DEBT-017
  quietHoursEnabled: true,
  quietStart: '22:00',
  quietEnd: '07:00',
  quietDays: '0,1,2,3,4,5,6',
  style: 'naturel',
  language: 'fr-FR',
  voice: null,
  volume: 1,
  allowedCategories: '',
  privacyMode: false,
  urgentOverrideQuiet: false,
  suspended: false,
  suspendedUntil: null,
  updatedAt: '',
}

function readPrefsFromStorage(): VoicePreferences {
  if (typeof window === 'undefined') return DEFAULT_VOICE_PREFERENCES
  try {
    const raw = window.localStorage.getItem(PREFS_STORAGE_KEY)
    if (!raw) return DEFAULT_VOICE_PREFERENCES
    const parsed: unknown = JSON.parse(raw)
    if (parsed === null || typeof parsed !== 'object') return DEFAULT_VOICE_PREFERENCES
    return { ...DEFAULT_VOICE_PREFERENCES, ...(parsed as Partial<VoicePreferences>) }
  } catch {
    return DEFAULT_VOICE_PREFERENCES
  }
}

function mirrorPrefsToStorage(prefs: VoicePreferences): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(prefs))
  } catch {
    // quota indisponible / navigation privée : miroir ignoré silencieusement
  }
}

export function useVoiceAssistant(onUnauthorized?: () => void) {
  const { toast } = useToast()

  const [prefs, setPrefs] = useState<VoicePreferences | null>(null)
  const [prefsLoading, setPrefsLoading] = useState(true)
  const [announcements, setAnnouncements] = useState<JournalEntry[]>([])
  const [lastTick, setLastTick] = useState<ServerTickInfo>({
    now: null,
    quietHours: null,
    at: null,
    ok: true,
  })
  const [tasks, setTasks] = useState<Task[]>([])
  const [tasksLoading, setTasksLoading] = useState(true)

  const seenIdsRef = useRef<Set<string>>(new Set())
  const prefsRef = useRef<VoicePreferences | null>(null)

  useEffect(() => {
    prefsRef.current = prefs
  }, [prefs])

  // FEATURE-AUTH — session expirée (401) : notifie le parent une seule fois via
  // un callback mémorisé dans un ref (stable entre les rendus).
  const onUnauthorizedRef = useRef(onUnauthorized)
  useEffect(() => {
    onUnauthorizedRef.current = onUnauthorized
  }, [onUnauthorized])

  /** Renvoie true si l'erreur est un 401 (session absente/expirée) et déclenche la déconnexion. */
  const handleUnauthorized = useCallback((error: unknown): boolean => {
    if (error instanceof ApiError && error.status === 401) {
      onUnauthorizedRef.current?.()
      return true
    }
    return false
  }, [])

  const handleAnnouncements = useCallback(
    (list: Announcement[]) => {
      if (list.length === 0) return
      const fresh = list.filter((a) => !seenIdsRef.current.has(a.id))
      if (fresh.length === 0) return
      for (const announcement of fresh) seenIdsRef.current.add(announcement.id)

      const receivedAt = new Date().toISOString()
      setAnnouncements((prev) =>
        [...fresh.slice().reverse().map((announcement) => ({ announcement, receivedAt })), ...prev].slice(
          0,
          JOURNAL_LIMIT,
        ),
      )

      const current = prefsRef.current
      for (const announcement of fresh) {
        if (announcement.spoken) {
          const spoken = speak(announcement.message, {
            voiceName: current?.voice ?? null,
            lang: current?.language ?? 'fr-FR',
            volume: current?.volume ?? 1,
          })
          if (!spoken) {
            toast({
              title: 'Synthèse vocale indisponible sur ce navigateur',
              description: announcement.message,
              variant: 'destructive',
            })
          }
          notify({ title: announcement.title, body: announcement.message, tag: announcement.id })
          if (spoken) {
            toast({ title: announcement.title, description: announcement.message })
          }
        } else {
          // Supprimée par heures silencieuses / suspension : notification muette seulement
          notify({ title: announcement.title, body: announcement.message, silent: true, tag: announcement.id })
        }
      }
    },
    [toast],
  )

  const tickNow = useCallback(async () => {
    try {
      const data = await apiFetch<TickResponse>('/api/assistant/tick', { method: 'POST' })
      setLastTick({ now: data.now, quietHours: data.quietHours, at: new Date().toISOString(), ok: true })
      handleAnnouncements(data.announcements)
    } catch (error) {
      handleUnauthorized(error)
      // Pas de toast à chaque échec de tick (boucle 30 s) : l'état serveur est
      // affiché dans le footer ; les erreurs d'actions utilisateur sont toastées.
      setLastTick((prev) => ({
        now: prev.now,
        quietHours: prev.quietHours,
        at: new Date().toISOString(),
        ok: false,
      }))
    }
  }, [handleAnnouncements])

  // Chargement initial des préférences (GET, fallback localStorage) + premier tick
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const data = await apiFetch<{ preferences: VoicePreferences }>('/api/voice-preferences')
        if (cancelled) return
        setPrefs(data.preferences)
        prefsRef.current = data.preferences
        mirrorPrefsToStorage(data.preferences)
      } catch (error) {
        handleUnauthorized(error)
        if (cancelled) return
        const fallback = readPrefsFromStorage()
        setPrefs(fallback)
        prefsRef.current = fallback
      } finally {
        if (!cancelled) setPrefsLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  // Boucle de tick (30 s) + tick immédiat au montage
  useEffect(() => {
    void tickNow()
    const id = setInterval(() => {
      void tickNow()
    }, TICK_INTERVAL_MS)
    return () => clearInterval(id)
  }, [tickNow])

  const refreshTasks = useCallback(async () => {
    try {
      const data = await apiFetch<{ tasks: Task[] }>('/api/tasks')
      setTasks(data.tasks)
    } catch (error) {
      if (!handleUnauthorized(error)) {
        toast({
          title: 'Impossible de charger les tâches',
          description: error instanceof Error ? error.message : undefined,
          variant: 'destructive',
        })
      }
    } finally {
      setTasksLoading(false)
    }
  }, [handleUnauthorized, toast])

  useEffect(() => {
    void refreshTasks()
  }, [refreshTasks])

  const savePrefs = useCallback(
    async (partial: Partial<VoicePreferences>) => {
      const current = prefsRef.current
      if (!current) return
      const optimistic = { ...current, ...partial }
      setPrefs(optimistic)
      prefsRef.current = optimistic
      mirrorPrefsToStorage(optimistic)
      try {
        const data = await apiFetch<{ preferences: VoicePreferences }>('/api/voice-preferences', {
          method: 'PUT',
          body: JSON.stringify(partial),
        })
        setPrefs(data.preferences)
        prefsRef.current = data.preferences
        mirrorPrefsToStorage(data.preferences)
        toast({ title: 'Préférences enregistrées', description: 'Vos réglages sont synchronisés.' })
      } catch (error) {
        // Repli : état précédent + miroir cohérent
        setPrefs(current)
        prefsRef.current = current
        mirrorPrefsToStorage(current)
        if (!handleUnauthorized(error)) {
          toast({
            title: "Échec de l'enregistrement",
            description: error instanceof Error ? error.message : undefined,
            variant: 'destructive',
          })
        }
      }
    },
    [handleUnauthorized, toast],
  )

  const speakTest = useCallback(async () => {
    const current = prefsRef.current
    try {
      const data = await apiFetch<TestVoiceResponse>('/api/assistant/test-voice', {
        method: 'POST',
        body: JSON.stringify({ style: current?.style ?? 'naturel' }),
      })
      const spoken = speak(data.message, {
        voiceName: current?.voice ?? null,
        lang: current?.language ?? 'fr-FR',
        volume: current?.volume ?? 1,
      })
      if (!spoken) {
        toast({
          title: 'Synthèse vocale indisponible sur ce navigateur',
          description: data.message,
          variant: 'destructive',
        })
      } else {
        toast({ title: 'Test de voix', description: data.message })
      }
    } catch (error) {
      if (!handleUnauthorized(error)) {
        toast({
          title: 'Impossible de générer le message de test',
          description: error instanceof Error ? error.message : undefined,
          variant: 'destructive',
        })
      }
    }
  }, [handleUnauthorized, toast])

  const snooze = useCallback(
    async (logId: string, minutes = 5) => {
      try {
        await apiFetch<{ ok: boolean }>('/api/assistant/snooze', {
          method: 'POST',
          body: JSON.stringify({ logId, minutes }),
        })
        setAnnouncements((prev) => prev.filter((entry) => entry.announcement.id !== logId))
        toast({ title: `Annonce reportée de ${minutes} minutes`, description: 'Elle sera rappelée plus tard.' })
      } catch (error) {
        if (!handleUnauthorized(error)) {
          toast({
            title: 'Impossible de reporter l\'annonce',
            description: error instanceof Error ? error.message : undefined,
            variant: 'destructive',
          })
        }
      }
    },
    [handleUnauthorized, toast],
  )

  const categories = useMemo(
    () =>
      Array.from(new Set(tasks.map((task) => task.category).filter((category) => category.length > 0))).sort(
        (a, b) => a.localeCompare(b, 'fr'),
      ),
    [tasks],
  )

  const quietHours = lastTick.quietHours

  return {
    prefs,
    prefsLoading,
    announcements,
    lastTick,
    lastTickLabel: lastTick.at ? formatTimeFR(lastTick.at) : null,
    serverOk: lastTick.ok,
    quietHours,
    tasks,
    tasksLoading,
    categories,
    savePrefs,
    refreshTasks,
    tickNow,
    speakTest,
    snooze,
    speechSupported: isSpeechSynthesisSupported(),
  }
}

export type VoiceAssistant = ReturnType<typeof useVoiceAssistant>
