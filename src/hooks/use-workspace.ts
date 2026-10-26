'use client'

/**
 * use-workspace — données de l'espace de travail (FEATURE-UI-SHELL).
 * Charge projets, notes et journal d'activité (GET) et expose les mutateurs
 * (créer / mettre à jour / supprimer) avec rafraîchissement local.
 * Fetch relatif UNIQUEMENT via apiFetch (erreurs { error } uniformes).
 */

import { useCallback, useEffect, useState } from 'react'

import { ApiError, apiFetch } from '@/lib/assistant/api'
import type { ActivityEntry, Note, Project } from '@/types/workspace'

export function useWorkspace(onUnauthorized?: () => void) {
  const [projects, setProjects] = useState<Project[]>([])
  const [projectsLoading, setProjectsLoading] = useState(true)
  const [notes, setNotes] = useState<Note[]>([])
  const [notesLoading, setNotesLoading] = useState(true)
  const [activity, setActivity] = useState<ActivityEntry[]>([])
  const [activityLoading, setActivityLoading] = useState(true)

  /** 401 → notifie le parent une seule fois (session expirée). */
  const unauthorizedRef = { current: onUnauthorized }
  const guard = useCallback(
    (error: unknown) => {
      if (error instanceof ApiError && error.status === 401) {
        unauthorizedRef.current?.()
      }
      throw error
    },
    [unauthorizedRef]
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

  useEffect(() => {
    void refreshProjects().catch(() => setProjectsLoading(false))
    void refreshNotes().catch(() => setNotesLoading(false))
    void refreshActivity().catch(() => setActivityLoading(false))
  }, [refreshProjects, refreshNotes, refreshActivity])

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
    await Promise.all([refreshProjects(), refreshNotes(), refreshActivity()])
  }, [refreshProjects, refreshNotes, refreshActivity])

  return {
    projects,
    projectsLoading,
    notes,
    notesLoading,
    activity,
    activityLoading,
    refreshProjects,
    refreshNotes,
    refreshActivity,
    refreshAll,
    createProject,
    updateProject,
    deleteProject,
    createNote,
    updateNote,
    deleteNote,
  }
}
