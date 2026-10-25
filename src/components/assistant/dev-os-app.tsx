'use client'

/**
 * DevOSApp — racine cliente de la page unique `/` (FEATURE-001).
 * 3 onglets : Assistant · Tâches · Paramètres. Header (h1 + statut + identité) + footer sticky.
 * Couleurs sémantiques : actif=emerald, suspendu=amber, heures silencieuses=zinc. Aucun bleu/indigo.
 * FEATURE-AUTH : exigé connecté (AuthGate en amont) ; expiration de session (401) → onSessionExpired.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { LogOut, Volume2 } from 'lucide-react'

import { AssistantPanel } from '@/components/assistant/assistant-panel'
import { SettingsScreen } from '@/components/assistant/settings-screen'
import { TasksManager } from '@/components/assistant/tasks-manager'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useVoiceAssistant } from '@/hooks/use-voice-assistant'
import { cn } from '@/lib/utils'
import type { AuthUser } from '@/types/assistant'

interface DevOSAppProps {
  user: AuthUser
  onLogout: () => Promise<void> | void
  /** Session expirée côté serveur (401 renvoyé par un endpoint métier). */
  onSessionExpired: () => void
}

type AssistantStatus = 'active' | 'suspended' | 'quiet'
type TabKey = 'assistant' | 'tasks' | 'settings'

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
  const [activeTab, setActiveTab] = useState<TabKey>('assistant')
  const [highlightTaskId, setHighlightTaskId] = useState<string | null>(null)
  const [clock, setClock] = useState<string>('')

  // Horloge locale (côté client uniquement — évite tout écart d'hydratation)
  useEffect(() => {
    const update = () => setClock(new Date().toLocaleTimeString('fr-FR'))
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [])

  const status = useMemo<AssistantStatus | null>(() => {
    const prefs = assistant.prefs
    if (!prefs) return null
    const suspendedNow =
      prefs.suspended ||
      (prefs.suspendedUntil !== null && new Date(prefs.suspendedUntil).getTime() > Date.now())
    if (!prefs.enabled || suspendedNow) return 'suspended'
    if (assistant.quietHours?.active) return 'quiet'
    return 'active'
  }, [assistant.prefs, assistant.quietHours])

  const handleViewTask = useCallback((taskId: string) => {
    setHighlightTaskId(taskId)
    setActiveTab('tasks')
    window.setTimeout(() => setHighlightTaskId(null), 6000)
  }, [])

  // Après chaque mutation de tâche : rafraîchir la liste + tick immédiat (recalcul)
  const handleTaskMutated = useCallback(() => {
    void assistant.refreshTasks()
    void assistant.tickNow()
  }, [assistant.refreshTasks, assistant.tickNow])

  const toggleSuspended = useCallback(() => {
    const prefs = assistant.prefs
    if (!prefs) return
    void assistant.savePrefs({ suspended: !prefs.suspended, suspendedUntil: null })
  }, [assistant.prefs, assistant.savePrefs])

  const statusConfig = status ? STATUS_CONFIG[status] : null

  const initials = useMemo(() => {
    const source = (user.name ?? user.email).trim()
    const parts = source.split(/[\s@._-]+/).filter(Boolean)
    const letters = parts
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('')
    return letters || '?'
  }, [user.name, user.email])

  const handleLogoutClick = useCallback(() => {
    void onLogout()
  }, [onLogout])

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span
              className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground"
              aria-hidden="true"
            >
              <Volume2 className="size-5" />
            </span>
            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold leading-tight sm:text-lg">
                DevOS — Assistant vocal proactif
              </h1>
              <p className="text-xs text-muted-foreground sm:text-sm">
                Rappels vocaux intelligents pour vos tâches
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {statusConfig ? (
              <Badge
                variant="outline"
                className={cn('gap-1.5 px-2.5 py-1 text-xs font-medium', statusConfig.className)}
                aria-label={`État de l'assistant : ${statusConfig.label}`}
              >
                <span className={cn('size-2 rounded-full', statusConfig.dot)} aria-hidden="true" />
                {statusConfig.label}
              </Badge>
            ) : (
              <Skeleton className="h-6 w-32 rounded-full" />
            )}
            <div
              className="flex items-center gap-1.5 rounded-full border bg-card py-1 pl-1 pr-1"
              title={user.email}
            >
              <span
                className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary"
                aria-hidden="true"
              >
                {initials}
              </span>
              <span className="hidden max-w-40 truncate text-sm sm:inline">
                {user.name ?? user.email}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 rounded-full text-muted-foreground hover:text-foreground"
                onClick={handleLogoutClick}
                aria-label="Se déconnecter"
              >
                <LogOut className="size-4" aria-hidden="true" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-4 sm:px-6 sm:py-6">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabKey)} className="gap-4">
          <TabsList className="grid h-11 w-full grid-cols-3 sm:h-10 sm:w-fit sm:grid-cols-3">
            <TabsTrigger value="assistant" className="h-full min-h-11 sm:min-h-9">
              Assistant
            </TabsTrigger>
            <TabsTrigger value="tasks" className="h-full min-h-11 sm:min-h-9">
              Tâches
            </TabsTrigger>
            <TabsTrigger value="settings" className="h-full min-h-11 sm:min-h-9">
              Paramètres
            </TabsTrigger>
          </TabsList>

          <TabsContent value="assistant" className="mt-2">
            <AssistantPanel
              prefs={assistant.prefs}
              prefsLoading={assistant.prefsLoading}
              announcements={assistant.announcements}
              quietHours={assistant.quietHours}
              onSnooze={assistant.snooze}
              onSpeakTest={() => void assistant.speakTest()}
              onToggleSuspended={toggleSuspended}
              onViewTask={handleViewTask}
            />
          </TabsContent>

          <TabsContent value="tasks" className="mt-2">
            <TasksManager
              tasks={assistant.tasks}
              tasksLoading={assistant.tasksLoading}
              categories={assistant.categories}
              highlightTaskId={highlightTaskId}
              onMutated={handleTaskMutated}
            />
          </TabsContent>

          <TabsContent value="settings" className="mt-2">
            <SettingsScreen
              prefs={assistant.prefs}
              prefsLoading={assistant.prefsLoading}
              categories={assistant.categories}
              onSave={(partial) => void assistant.savePrefs(partial)}
              onSpeakTest={() => void assistant.speakTest()}
              onToggleSuspended={toggleSuspended}
            />
          </TabsContent>
        </Tabs>
      </main>

      <footer className="mt-auto border-t bg-card/80 pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3 text-xs text-muted-foreground sm:px-6 sm:text-sm">
          <span>© {new Date().getFullYear()} DevOS</span>
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>Heure locale : {clock || '—'}</span>
            <span aria-hidden="true">·</span>
            <span>Serveur : {assistant.serverOk ? 'connecté' : 'erreur de synchronisation'}</span>
            <span aria-hidden="true">·</span>
            <span>Dernière synchro : {assistant.lastTickLabel ?? '—'}</span>
            {assistant.quietHours?.active && assistant.quietHours.window ? (
              <>
                <span aria-hidden="true">·</span>
                <span>Heures silencieuses : {assistant.quietHours.window}</span>
              </>
            ) : null}
          </span>
        </div>
      </footer>
    </div>
  )
}
