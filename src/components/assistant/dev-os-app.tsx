'use client'

/**
 * DevOSApp — racine cliente de la page unique `/` (FEATURE-UI-SHELL, ADR-004).
 *
 * Routeur d'état : currentView (registre src/lib/navigation.ts) rendu dans
 * AppShell (sidebar desktop + tiroir mobile + barre inférieure 5 destinations).
 * Le moteur vocal FEATURE-001 (useVoiceAssistant) reste partagé par toutes les
 * vues ; l'hook useWorkspace alimente projets/notes/activité.
 * Rôle v1 : proprietaire (matrice ROLES_PERMISSIONS.md).
 */

import { useCallback, useMemo, useState, useEffect } from 'react'

import { AppShell } from '@/components/shell/app-shell'
import { ComingSoonView } from '@/components/shell/coming-soon-view'
import { ActivityView } from '@/components/views/activity-view'
import { AiChatView } from '@/components/views/ai-chat-view'
import { DashboardView } from '@/components/views/dashboard-view'
import { NotesView } from '@/components/views/notes-view'
import { NotificationsView } from '@/components/views/notifications-view'
import { PlanningView } from '@/components/views/planning-view'
import { ProjectsView } from '@/components/views/projects-view'
import { SettingsView } from '@/components/views/settings-view'
import { SyncView } from '@/components/views/sync-view'
import { TasksView } from '@/components/views/tasks-view'
import { VoiceView } from '@/components/views/voice-view'
import { useVoiceAssistant } from '@/hooks/use-voice-assistant'
import { useWorkspace } from '@/hooks/use-workspace'
import { DEFAULT_VIEW } from '@/lib/navigation'
import { DEFAULT_ROLE } from '@/lib/permissions'
import type { AuthUser } from '@/types/assistant'
import type { ViewId } from '@/types/workspace'

interface DevOSAppProps {
  user: AuthUser
  onLogout: () => Promise<void> | void
  /** Session expirée côté serveur (401 renvoyé par un endpoint métier). */
  onSessionExpired: () => void
}

type AssistantStatus = 'active' | 'suspended' | 'quiet'

const STATUS_CONFIG: Record<AssistantStatus, { label: string; className: string; dot: string }> = {
  active: {
    label: 'Actif',
    className:
      'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
    dot: 'bg-emerald-500',
  },
  suspended: {
    label: 'Suspendu',
    className:
      'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300',
    dot: 'bg-amber-500',
  },
  quiet: {
    label: 'Heures silencieuses en cours',
    className: 'border-zinc-300 bg-zinc-100 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300',
    dot: 'bg-zinc-500',
  },
}

export function DevOSApp({ user, onLogout, onSessionExpired }: DevOSAppProps) {
  const assistant = useVoiceAssistant(onSessionExpired)
  const workspace = useWorkspace(onSessionExpired)
  const [currentView, setCurrentView] = useState<ViewId>(DEFAULT_VIEW)
  const [highlightTaskId, setHighlightTaskId] = useState<string | null>(null)
  const [taskFormSignal, setTaskFormSignal] = useState(0)
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'unsupported'>('default')
  const [clock, setClock] = useState('')

  // Horloge locale (client uniquement — évite tout écart d'hydratation)
  useEffect(() => {
    const update = () => setClock(new Date().toLocaleTimeString('fr-FR'))
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [])

  // Permission notifications (lecture + écoute)
  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setNotificationPermission('unsupported')
      return
    }
    setNotificationPermission(Notification.permission)
  }, [])

  const requestNotificationPermission = useCallback(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return
    void Notification.requestPermission().then((result) => setNotificationPermission(result))
  }, [])

  const status = useMemo<AssistantStatus | null>(() => {
    const prefs = assistant.prefs
    if (!prefs) return null
    const suspendedNow =
      prefs.suspended || (prefs.suspendedUntil !== null && new Date(prefs.suspendedUntil).getTime() > Date.now())
    if (!prefs.enabled || suspendedNow) return 'suspended'
    if (assistant.quietHours?.active) return 'quiet'
    return 'active'
  }, [assistant.prefs, assistant.quietHours])

  const navigate = useCallback((view: ViewId) => {
    // Toutes les vues (actives et planned) ont un rendu : les planned affichent
    // la vue explicative ComingSoonView (structure cible — jamais de clic mort).
    setCurrentView(view)
    window.scrollTo({ top: 0 })
  }, [])

  const handleViewTask = useCallback(
    (taskId: string) => {
      setHighlightTaskId(taskId)
      setCurrentView('tasks')
      window.setTimeout(() => setHighlightTaskId(null), 6000)
    },
    []
  )

  const openNewTask = useCallback(() => {
    setTaskFormSignal((signal) => signal + 1)
    setCurrentView('tasks')
  }, [])
  const handleMutated = useCallback(() => {
    void assistant.refreshTasks()
    void assistant.tickNow()
    void workspace.refreshActivity()
    void workspace.refreshProjects()
  }, [assistant.refreshTasks, assistant.tickNow, workspace.refreshActivity, workspace.refreshProjects])

  const toggleSuspended = useCallback(() => {
    const prefs = assistant.prefs
    if (!prefs) return
    void assistant.savePrefs({ suspended: !prefs.suspended, suspendedUntil: null })
  }, [assistant.prefs, assistant.savePrefs])

  const statusConfig = status ? STATUS_CONFIG[status] : null

  const renderView = useCallback(() => {
    switch (currentView) {
      case 'dashboard':
        return (
          <DashboardView
            tasks={assistant.tasks}
            projects={workspace.projects}
            activity={workspace.activity}
            loading={assistant.tasksLoading || workspace.projectsLoading || workspace.activityLoading}
            announcements={assistant.announcements}
            onNavigate={navigate}
            onNewTask={openNewTask}
            onSpeakTest={() => void assistant.speakTest()}
          />
        )
      case 'projects':
        return (
          <ProjectsView
            projects={workspace.projects}
            projectsLoading={workspace.projectsLoading}
            tasks={assistant.tasks}
            loadingTasks={assistant.tasksLoading}
            onCreate={async (payload) => {
              await workspace.createProject(payload)
            }}
            onUpdate={async (id, payload) => {
              await workspace.updateProject(id, payload)
            }}
            onDelete={async (id) => {
              await workspace.deleteProject(id)
            }}
          />
        )
      case 'tasks':
        return (
          <TasksView
            formSignal={taskFormSignal}
            tasks={assistant.tasks}
            tasksLoading={assistant.tasksLoading}
            projects={workspace.projects}
            categories={assistant.categories}
            highlightTaskId={highlightTaskId}
            onMutated={handleMutated}
            onUnauthorized={onSessionExpired}
          />
        )
      case 'planning':
        return <PlanningView tasks={assistant.tasks} loading={assistant.tasksLoading} />
      case 'notes':
        return (
          <NotesView
            notes={workspace.notes}
            notesLoading={workspace.notesLoading}
            projects={workspace.projects.map((project) => ({ id: project.id, name: project.name }))}
            onCreate={async (payload) => {
              await workspace.createNote(payload)
            }}
            onUpdate={async (id, payload) => {
              await workspace.updateNote(id, payload)
            }}
            onDelete={async (id) => {
              await workspace.deleteNote(id)
            }}
          />
        )
      case 'ai-chat':
        return <AiChatView onUnauthorized={onSessionExpired} />
      case 'voice':
        return (
          <VoiceView
            prefs={assistant.prefs}
            prefsLoading={assistant.prefsLoading}
            announcements={assistant.announcements}
            quietHours={assistant.quietHours}
            onSnooze={assistant.snooze}
            onSpeakTest={() => void assistant.speakTest()}
            onToggleSuspended={toggleSuspended}
            onViewTask={handleViewTask}
          />
        )
      case 'activity':
        return (
          <ActivityView
            activity={workspace.activity}
            loading={workspace.activityLoading}
            onRefresh={workspace.refreshActivity}
          />
        )
      case 'notifications':
        return (
          <NotificationsView
            permission={notificationPermission}
            announcements={assistant.announcements}
            prefs={assistant.prefs}
            onRequestPermission={requestNotificationPermission}
            onNavigate={navigate}
          />
        )
      case 'sync':
        return <SyncView tick={assistant.lastTick} onRefresh={assistant.refreshTasks} onTickNow={assistant.tickNow} />
      case 'settings':
        return (
          <SettingsView
            prefs={assistant.prefs}
            prefsLoading={assistant.prefsLoading}
            categories={assistant.categories}
            onSave={(partial) => void assistant.savePrefs(partial)}
            onSpeakTest={() => void assistant.speakTest()}
            onToggleSuspended={toggleSuspended}
          />
        )
      case 'automations':
        return (
          <ComingSoonView
            viewId="automations"
            label="Automatisations"
            description="Déclencher des actions selon des conditions et horaires (scénarios prédéfinis)."
            plannedViews={['Mes automatisations', 'Créer', 'Historique des exécutions']}
            actions={['Créer un scénario (déclencheur → condition → action)', 'Exécution par le scheduler existant', 'Confirmations pour les actions sensibles']}
          />
        )
      case 'git':
        return (
          <ComingSoonView
            viewId="git"
            label="Dépôts & Git"
            description="Consulter et suivre les dépôts locaux autorisés."
            plannedViews={['Dépôts locaux', 'État Git', 'Branches', 'Commits', 'Modifications']}
            actions={['Enregistrer des dépôts autorisés', 'Lire état/branches/commits', 'Liste blanche d\u2019outils + confirmations']}
          />
        )
      case 'github':
        return (
          <ComingSoonView
            viewId="github"
            label="GitHub"
            description="Suivre le travail distant et préparer les revues."
            plannedViews={['Dépôts distants', 'Issues', 'Pull requests', 'Workflows CI/CD']}
            actions={['Connecter une intégration GitHub', 'Suivre issues/PR/CI', 'Masquage si non connecté (ADR-004)']}
          />
        )
      case 'terminal':
        return (
          <ComingSoonView
            viewId="terminal"
            label="Terminal & Outils"
            description="Exécuter les outils autorisés et suivre leurs résultats."
            plannedViews={['Sessions', 'Outils disponibles', "Tâches d'exécution", 'Résultats']}
            actions={['Liste blanche stricte d\u2019outils', 'Confirmations pour opérations sensibles', 'Journalisation intégrale']}
          />
        )
      case 'storage':
        return (
          <ComingSoonView
            viewId="storage"
            label="Stockage & Sauvegardes"
            description="Gérer les données et les restaurations."
            plannedViews={['Espace utilisé', 'Sauvegardes', 'Restaurations']}
            actions={['Mesurer l\u2019espace par type de données', 'Exporter/restaurer (JSON + pièces)', 'Sauvegarde planifiée']}
          />
        )
      default:
        return null
    }
  }, [
    currentView,
    assistant,
    workspace,
    navigate,
    openNewTask,
    handleViewTask,
    handleMutated,
    toggleSuspended,
    highlightTaskId,
    onSessionExpired,
    notificationPermission,
    requestNotificationPermission,
    taskFormSignal,
  ])

  return (
    <AppShell
      user={user}
      role={DEFAULT_ROLE}
      currentView={currentView}
      onNavigate={navigate}
      statusConfig={statusConfig}
      clock={clock}
      serverOk={assistant.serverOk}
      lastTickLabel={assistant.lastTickLabel}
      quietWindow={assistant.quietHours?.active ? (assistant.quietHours.window ?? null) : null}
      onLogout={() => void onLogout()}
    >
      {renderView()}
    </AppShell>
  )
}
