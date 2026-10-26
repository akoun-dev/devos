'use client'

/**
 * use-workspace — données de l'espace de travail (FEATURE-UI-SHELL + v1.4).
 * Charge projets, notes, journal d'activité et automatisations (GET) et expose
 * les mutateurs (créer / mettre à jour / supprimer / exécuter) avec
 * rafraîchissement local.
 * Fetch relatif UNIQUEMENT via apiFetch (erreurs { error } uniformes).
 */

import { useCallback, useEffect, useRef, useState } from 'react'

import { ApiError, apiFetch } from '@/lib/assistant/api'
import type {
  ActivityEntry,
  Automation,
  AutomationRun,
  Note,
  Project,
} from '@/types/workspace'

export function useWorkspace(onUnauthorized?: () => void) {
  const [projects, setProjects] = useState<Project[]>([])
  const [projectsLoading, setProjectsLoading] = useState(true)
  const [notes, setNotes] = useState<Note[]>([])
  const [notesLoading, setNotesLoading] = useState(true)
  const [activity, setActivity] = useState<ActivityEntry[]>([])
  const [activityLoading, setActivityLoading] = useState(true)
  const [automations, setAutomations] = useState<Automation[]>([])
  const [automationsLoading, setAutomationsLoading] = useState(true)

  /** 401 → notifie le parent une seule fois (session expirée) — ref stable entre rendus. */
  const unauthorizedRef = useRef(onUnauthorized)
  const guard = useCallback(
    (error: unknown) => {
      if (error instanceof ApiError && error.status === 401) {
        unauthorizedRef.current?.()
      }
      throw error
    },
    []
  )

  const refreshProjects = useCallback(async () => {
    try {
      const data = await apiFetch<{ projects: Project[] }>('/api/projects')
      setProjects(data.projects)
    } finally {
      setProjectsLoading(false)
    }
  }, [])

  const refreshNotes = useCallback(async () => {
    try {
      const data = await apiFetch<{ notes: Note[] }>('/api/notes')
      setNotes(data.notes)
    } finally {
      setNotesLoading(false)
    }
  }, [])

  const refreshActivity = useCallback(async () => {
    try {
      const data = await apiFetch<{ activity: ActivityEntry[] }>('/api/activity?limit=100')
      setActivity(data.activity)
    } finally {
      setActivityLoading(false)
    }
  }, [])

  const refreshAutomations = useCallback(async () => {
    try {
      const data = await apiFetch<{ automations: Automation[] }>('/api/automations')
      setAutomations(data.automations)
    } finally {
      setAutomationsLoading(false)
    }
  }, [])

  useEffect(() => {
    void refreshProjects().catch(() => setProjectsLoading(false))
    void refreshNotes().catch(() => setNotesLoading(false))
    void refreshActivity().catch(() => setActivityLoading(false))
    void refreshAutomations().catch(() => setAutomationsLoading(false))
  }, [refreshProjects, refreshNotes, refreshActivity, refreshAutomations])

  const createProject = useCallback(
    async (payload: {
      name: string
      description?: string
      priority?: Project['priority']
      dueAt?: string | null
    }) => {
      try {
        const data = await apiFetch<{ project: Project }>('/api/projects', {
          method: 'POST',
          body: JSON.stringify(payload),
        })
        await refreshProjects()
        return data.project
      } catch (error) {
        return guard(error)
      }
    },
    [refreshProjects, guard]
  )

  const updateProject = useCallback(
    async (id: string, payload: Partial<Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'taskCount' | 'doneTaskCount'>>) => {
      try {
        await apiFetch<{ project: Project }>(`/api/projects/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        })
        await refreshProjects()
      } catch (error) {
        guard(error)
      }
    },
    [refreshProjects, guard]
  )

  const deleteProject = useCallback(
    async (id: string) => {
      try {
        await apiFetch<{ ok: boolean }>(`/api/projects/${id}`, { method: 'DELETE' })
        await refreshProjects()
      } catch (error) {
        guard(error)
      }
    },
    [refreshProjects, guard]
  )

  const createNote = useCallback(
    async (payload: { title: string; content?: string; projectId?: string | null }) => {
      try {
        await apiFetch<{ note: Note }>('/api/notes', {
          method: 'POST',
          body: JSON.stringify(payload),
        })
        await refreshNotes()
      } catch (error) {
        guard(error)
      }
    },
    [refreshNotes, guard]
  )

  const updateNote = useCallback(
    async (id: string, payload: Partial<Omit<Note, 'id' | 'createdAt' | 'updatedAt' | 'projectName'>>) => {
      try {
        await apiFetch<{ note: Note }>(`/api/notes/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        })
        await refreshNotes()
      } catch (error) {
        guard(error)
      }
    },
    [refreshNotes, guard]
  )

  const deleteNote = useCallback(
    async (id: string) => {
      try {
        await apiFetch<{ ok: boolean }>(`/api/notes/${id}`, { method: 'DELETE' })
        await refreshNotes()
      } catch (error) {
        guard(error)
      }
    },
    [refreshNotes, guard]
  )

  const refreshAll = useCallback(async () => {
    await Promise.all([refreshProjects(), refreshNotes(), refreshActivity(), refreshAutomations()])
  }, [refreshProjects, refreshNotes, refreshActivity, refreshAutomations])

  // ─── Automatisations (contrat v1.4) ───

  const createAutomation = useCallback(
    async (payload: {
      name: string
      triggerType: 'schedule' | 'condition'
      scheduleTime?: string
      scheduleDays?: string
      conditionType?: 'overdue_count'
      threshold?: number
      message?: string
    }) => {
      try {
        const data = await apiFetch<{ automation: Automation }>('/api/automations', {
          method: 'POST',
          body: JSON.stringify(payload),
        })
        await refreshAutomations()
        return data.automation
      } catch (error) {
        return guard(error)
      }
    },
    [refreshAutomations, guard],
  )

  const updateAutomation = useCallback(
    async (id: string, payload: Partial<Omit<Automation, 'id' | 'createdAt' | 'updatedAt' | 'lastRunAt'>>) => {
      try {
        await apiFetch<{ automation: Automation }>(`/api/automations/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        })
        await refreshAutomations()
      } catch (error) {
        guard(error)
      }
    },
    [refreshAutomations, guard],
  )

  const deleteAutomation = useCallback(
    async (id: string) => {
      try {
        await apiFetch<{ ok: boolean }>(`/api/automations/${id}`, { method: 'DELETE' })
        await refreshAutomations()
      } catch (error) {
        guard(error)
      }
    },
    [refreshAutomations, guard],
  )

  const runAutomation = useCallback(
    async (id: string): Promise<AutomationRun | null> => {
      try {
        const data = await apiFetch<{ run: AutomationRun }>(`/api/automations/${id}/run`, {
          method: 'POST',
        })
        await refreshAutomations()
        return data.run
      } catch (error) {
        return guard(error)
      }
    },
    [refreshAutomations, guard],
  )

  const fetchAutomationRuns = useCallback(
    async (id: string): Promise<{ automation: Automation; runs: AutomationRun[] } | null> => {
      try {
        return await apiFetch<{ automation: Automation; runs: AutomationRun[] }>(
          `/api/automations/${id}`,
        )
      } catch (error) {
        return guard(error)
      }
    },
    [guard],
  )

  return {
    projects,
    projectsLoading,
    notes,
    notesLoading,
    activity,
    activityLoading,
    automations,
    automationsLoading,
    refreshProjects,
    refreshNotes,
    refreshActivity,
    refreshAutomations,
    refreshAll,
    createProject,
    updateProject,
    deleteProject,
    createNote,
    updateNote,
    deleteNote,
    createAutomation,
    updateAutomation,
    deleteAutomation,
    runAutomation,
    fetchAutomationRuns,
  }
}
