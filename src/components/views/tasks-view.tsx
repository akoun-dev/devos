'use client'

/**
 * TasksView — vue Tâches avec les « smart views » du cahier des charges §3.2 :
 * Ma journée, À faire, En cours, En retard, Prioritaires, Terminées, Toutes.
 * Découpage (DEBT-017) : badges / carte / formulaire dans des fichiers dédiés.
 */

import { useEffect, useMemo, useState } from 'react'
import { CalendarClock, CircleDot, Flag, ListTodo, Loader2, PlusCircle, Sunrise } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TaskCard } from '@/components/views/task-card'
import { TaskFormDialog } from '@/components/views/task-form-dialog'
import { ApiError, apiFetch } from '@/lib/assistant/api'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import type { Task, TaskPriority, TaskStatus } from '@/types/assistant'
import type { Project } from '@/types/workspace'

type SmartView = 'jour' | 'a_faire' | 'en_cours' | 'retard' | 'prioritaires' | 'terminees' | 'toutes'

interface TasksViewProps {
  tasks: Task[]
  tasksLoading: boolean
  projects: Project[]
  categories: string[]
  highlightTaskId: string | null
  onMutated: () => void
  onUnauthorized: () => void
  /** Signal d'ouverture du formulaire (depuis le dashboard : « Nouvelle tâche »). */
  formSignal?: number
}

const SMART_VIEWS: { id: SmartView; label: string; icon: typeof Sunrise }[] = [
  { id: 'jour', label: 'Ma journée', icon: Sunrise },
  { id: 'a_faire', label: 'À faire', icon: CircleDot },
  { id: 'en_cours', label: 'En cours', icon: Loader2 },
  { id: 'retard', label: 'En retard', icon: CalendarClock },
  { id: 'prioritaires', label: 'Prioritaires', icon: Flag },
  { id: 'terminees', label: 'Terminées', icon: ListTodo },
  { id: 'toutes', label: 'Toutes', icon: ListTodo },
]

function isToday(iso: string | null): boolean {
  if (!iso) return false
  const date = new Date(iso)
  const now = new Date()
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  )
}

function applySmartView(tasks: Task[], view: SmartView): Task[] {
  const now = Date.now()
  const active = tasks.filter((task) => task.status === 'en_cours')
  switch (view) {
    case 'jour':
      return active.filter((task) => isToday(task.dueAt))
    case 'a_faire':
      return active.filter((task) => task.priority === 'basse' || task.priority === 'normale')
    case 'en_cours':
      return active
    case 'retard':
      return active.filter((task) => task.dueAt !== null && new Date(task.dueAt).getTime() < now)
    case 'prioritaires':
      return active.filter((task) => task.priority === 'haute' || task.priority === 'urgente')
    case 'terminees':
      return tasks.filter((task) => task.status === 'terminee')
    case 'toutes':
      return tasks
  }
}

export function TasksView({
  tasks,
  tasksLoading,
  projects,
  categories,
  highlightTaskId,
  onMutated,
  onUnauthorized,
  formSignal = 0,
}: TasksViewProps) {
  const { toast } = useToast()
  const [smartView, setSmartView] = useState<SmartView>('jour')
  const [formOpen, setFormOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null)
  const [busy, setBusy] = useState(false)

  // Ouverture du formulaire pilotée par le signal du dashboard.
  useEffect(() => {
    if (formSignal > 0) setFormOpen(true)
  }, [formSignal])

  const filtered = useMemo(() => applySmartView(tasks, smartView), [tasks, smartView])

  const handleCreate = async (payload: {
    title: string
    description?: string
    category?: string
    priority: TaskPriority
    dueAt: string | null
    reminderEnabled: boolean
    reminderOffsetMinutes: number | null
    projectId?: string | null
  }) => {
    await apiFetch<{ task: Task }>('/api/tasks', { method: 'POST', body: JSON.stringify(payload) })
    toast({ title: 'Tâche créée' })
    onMutated()
  }

  const handleSetStatus = async (task: Task, status: TaskStatus) => {
    setBusy(true)
    try {
      await apiFetch(`/api/tasks/${task.id}`, { method: 'PATCH', body: JSON.stringify({ status }) })
      toast({ title: `Tâche ${status === 'terminee' ? 'terminée' : 'annulée'}`, description: task.title })
      onMutated()
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) onUnauthorized()
      toast({
        title: 'Impossible de modifier la tâche',
        description: error instanceof Error ? error.message : undefined,
        variant: 'destructive',
      })
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setBusy(true)
    try {
      await apiFetch(`/api/tasks/${deleteTarget.id}`, { method: 'DELETE' })
      toast({ title: 'Tâche supprimée', description: deleteTarget.title })
      setDeleteTarget(null)
      onMutated()
    } catch (error) {
      toast({
        title: 'Impossible de supprimer la tâche',
        description: error instanceof Error ? error.message : undefined,
        variant: 'destructive',
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={smartView} onValueChange={(value) => setSmartView(value as SmartView)}>
          <TabsList className="h-auto w-full flex-wrap justify-start gap-1 sm:w-fit">
            {SMART_VIEWS.map((view) => {
              const Icon = view.icon
              return (
                <TabsTrigger key={view.id} value={view.id} className="min-h-11 gap-1.5 sm:min-h-9">
                  <Icon className="size-3.5" aria-hidden="true" />
                  {view.label}
                </TabsTrigger>
              )
            })}
          </TabsList>
        </Tabs>
        <Button onClick={() => setFormOpen(true)} className="min-h-11 sm:min-h-9">
          <PlusCircle aria-hidden="true" />
          Nouvelle tâche
        </Button>
      </div>

      {tasksLoading ? (
        <div className="space-y-3" aria-busy="true" aria-label="Chargement des tâches">
          {[0, 1, 2].map((index) => (
            <Skeleton key={index} className="h-24 w-full rounded-lg" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            Aucune tâche dans cette vue — {smartView === 'jour' ? 'rien de prévu aujourd\u2019hui.' : 'créez-en une avec « Nouvelle tâche ».'}
          </CardContent>
        </Card>
      ) : (
        <ul className={cn('space-y-3', filtered.length > 8 && 'devos-scroll max-h-[36rem] overflow-y-auto pr-1')} aria-label="Liste des tâches">
          {filtered.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              highlighted={task.id === highlightTaskId}
              onSetStatus={(target, status) => void handleSetStatus(target, status)}
              onRequestDelete={setDeleteTarget}
              busy={busy}
            />
          ))}
        </ul>
      )}

      <TaskFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        projects={projects}
        categories={categories}
        onCreate={async (payload) => {
          try {
            await handleCreate(payload)
          } catch (error) {
            toast({
              title: 'Impossible de créer la tâche',
              description: error instanceof Error ? error.message : undefined,
              variant: 'destructive',
            })
          }
        }}
      />

      <Dialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer cette tâche ?</DialogTitle>
            <DialogDescription>
              « {deleteTarget?.title} » sera définitivement supprimée, ainsi que ses rappels. Cette
              action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} className="min-h-11 sm:min-h-9">
              Annuler
            </Button>
            <Button variant="destructive" onClick={() => void handleDelete()} disabled={busy} className="min-h-11 sm:min-h-9">
              {busy ? 'Suppression…' : 'Supprimer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
