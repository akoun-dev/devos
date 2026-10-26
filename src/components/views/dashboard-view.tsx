'use client'

/**
 * DashboardView — Tableau de bord (cahier des charges §2.A) : vue synthétique
 * (compteurs réels), Mes priorités (urgentes/hautes actives), échéances du
 * jour, Activité récente (journal serveur). Toutes les données sont réelles.
 */

import { useMemo } from 'react'
import { AlertTriangle, CalendarClock, FolderKanban, ListChecks, Mic, PlusCircle, Sparkles } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { PriorityBadge } from '@/components/views/tasks-badges'
import { formatDateTimeFR, formatTimeFR } from '@/lib/assistant/format'
import type { JournalEntry } from '@/hooks/use-voice-assistant'
import type { ActivityEntry, Project, ViewId } from '@/types/workspace'
import type { Task } from '@/types/assistant'

interface DashboardViewProps {
  tasks: Task[]
  projects: Project[]
  activity: ActivityEntry[]
  loading: boolean
  announcements: JournalEntry[]
  onNavigate: (view: ViewId) => void
  onNewTask: () => void
  onSpeakTest: () => void
}

function todayBounds(now: Date): { start: number; end: number } {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  return { start, end: start + 24 * 60 * 60 * 1000 - 1 }
}

export function DashboardView({
  tasks,
  projects,
  activity,
  loading,
  announcements,
  onNavigate,
  onNewTask,
  onSpeakTest,
}: DashboardViewProps) {
  const stats = useMemo(() => {
    const now = new Date()
    const { start, end } = todayBounds(now)
    const active = tasks.filter((task) => task.status === 'en_cours')
    const overdue = active.filter((task) => task.dueAt && new Date(task.dueAt).getTime() < now.getTime())
    const today = active.filter((task) => task.dueAt && new Date(task.dueAt).getTime() >= start && new Date(task.dueAt).getTime() <= end)
    const priorities = active
      .filter((task) => task.priority === 'urgente' || task.priority === 'haute')
      .sort((a, b) => {
        const rank = (p: string) => (p === 'urgente' ? 0 : 1)
        return rank(a.priority) - rank(b.priority) || (a.dueAt ? new Date(a.dueAt).getTime() : Infinity) - (b.dueAt ? new Date(b.dueAt).getTime() : Infinity)
      })
    return {
      activeCount: active.length,
      overdueCount: overdue.length,
      todayCount: today.length,
      activeProjects: projects.filter((project) => project.status === 'actif').length,
      priorities: priorities.slice(0, 5),
    }
  }, [tasks, projects])

  const summary = useMemo(() => {
    const hour = new Date().getHours()
    const moment = hour < 12 ? 'matin' : hour < 18 ? 'après-midi' : 'soir'
    const parts = [
      `${stats.activeCount} tâche${stats.activeCount > 1 ? 's' : ''} en cours`,
      `${stats.todayCount} échéance${stats.todayCount > 1 ? 's' : ''} aujourd'hui`,
      `${stats.overdueCount} en retard`,
      `${stats.activeProjects} projet${stats.activeProjects > 1 ? 's' : ''} actif${stats.activeProjects > 1 ? 's' : ''}`,
    ]
    return `Bon ${moment} — ${parts.join(' · ')}.`
  }, [stats])

  return (
    <div className="flex flex-col gap-4">
      {/* Résumé du jour */}
      <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50/60 to-transparent dark:border-emerald-900 dark:from-emerald-950/40">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="size-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            Résumé du jour
          </CardTitle>
          <CardDescription>{summary}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button size="sm" className="min-h-11 sm:min-h-9" onClick={onNewTask}>
            <PlusCircle aria-hidden="true" />
            Nouvelle tâche
          </Button>
          <Button size="sm" variant="outline" className="min-h-11 sm:min-h-9" onClick={onSpeakTest}>
            <Mic aria-hidden="true" />
            Tester la voix
          </Button>
          <Button size="sm" variant="ghost" className="min-h-11 sm:min-h-9" onClick={() => onNavigate('ai-chat')}>
            <Sparkles aria-hidden="true" />
            Ouvrir l&apos;assistant IA
          </Button>
        </CardContent>
      </Card>

      {/* Compteurs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'En cours', value: stats.activeCount, icon: ListChecks, view: 'tasks' as ViewId },
          { label: "Aujourd'hui", value: stats.todayCount, icon: CalendarClock, view: 'planning' as ViewId },
          { label: 'En retard', value: stats.overdueCount, icon: AlertTriangle, view: 'tasks' as ViewId, alert: stats.overdueCount > 0 },
          { label: 'Projets actifs', value: stats.activeProjects, icon: FolderKanban, view: 'projects' as ViewId },
        ].map((card) => {
          const Icon = card.icon
          return (
            <button
              key={card.label}
              type="button"
              onClick={() => onNavigate(card.view)}
              className="flex min-h-24 flex-col items-start gap-1.5 rounded-lg border bg-card p-3 text-left shadow-xs transition-colors hover:bg-muted/50"
            >
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Icon className={card.alert ? 'size-3.5 text-destructive' : 'size-3.5'} aria-hidden="true" />
                {card.label}
              </span>
              {loading ? (
                <Skeleton className="h-7 w-10" />
              ) : (
                <span className={card.alert && card.value > 0 ? 'text-2xl font-semibold text-destructive' : 'text-2xl font-semibold'}>
                  {card.value}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Mes priorités */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Mes priorités</CardTitle>
            <CardDescription>Tâches urgentes et hautes non terminées</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2" aria-busy="true">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : stats.priorities.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune priorité active — tout est sous contrôle.</p>
            ) : (
              <ul className="space-y-2" aria-label="Tâches prioritaires">
                {stats.priorities.map((task) => (
                  <li key={task.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-2">
                    <span className="min-w-0 flex-1 truncate text-sm">{task.title}</span>
                    <span className="flex shrink-0 items-center gap-1.5">
                      <PriorityBadge priority={task.priority} />
                      {task.dueAt ? (
                        <span className="text-xs text-muted-foreground">{formatDateTimeFR(task.dueAt)}</span>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Activité récente */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Activité récente</CardTitle>
            <CardDescription>Dernières annonces du serveur</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2" aria-busy="true">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : activity.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucune activité pour le moment — les rappels apparaîtront ici.
              </p>
            ) : (
              <ul className="devos-scroll max-h-56 space-y-2 overflow-y-auto pr-1" aria-label="Activité récente">
                {activity.slice(0, 12).map((entry) => (
                  <li key={entry.id} className="flex items-start justify-between gap-2 text-sm">
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-1">{entry.message ?? entry.taskTitle ?? entry.type}</span>
                      <span className="ml-1.5 text-xs text-muted-foreground">{formatTimeFR(entry.createdAt)}</span>
                    </span>
                    {entry.type === 'ia' || entry.messageSource === 'ia' ? (
                      <Badge variant="secondary" className="shrink-0 text-[10px]">
                        IA
                      </Badge>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dernières annonces vocales (session) */}
      {announcements.length > 0 ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Annonces de cette session</CardTitle>
            <CardDescription>{announcements.length} annonce(s) reçue(s) depuis la connexion</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="devos-scroll max-h-40 space-y-1.5 overflow-y-auto pr-1 text-sm" aria-label="Annonces de la session">
              {announcements.slice(0, 8).map((entry) => (
                <li key={entry.announcement.id} className="flex items-center justify-between gap-2">
                  <span className="line-clamp-1 flex-1">{entry.announcement.message}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{formatTimeFR(entry.receivedAt)}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
