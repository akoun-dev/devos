'use client'

/**
 * Onglet « Tâches » — formulaire de création, filtres, liste avec actions.
 * Chaque mutation (création / statut / suppression) déclenche onMutated()
 * → rafraîchissement de la liste + tick immédiat (recalcul serveur).
 */

import { useMemo, useState } from 'react'
import { Ban, Check, PlusCircle, Trash2 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { apiFetch } from '@/lib/assistant/api'
import { datetimeLocalToIso, formatDateTimeFR, formatDueRelative } from '@/lib/assistant/format'
import type { Task, TaskPriority, TaskStatus } from '@/types/assistant'
import { cn } from '@/lib/utils'

interface TasksManagerProps {
  tasks: Task[]
  tasksLoading: boolean
  categories: string[]
  /** tâche à surligner (depuis « Voir la tâche » du journal) */
  highlightTaskId: string | null
  onMutated: () => void
}

const PRIORITY_OPTIONS: { value: TaskPriority; label: string }[] = [
  { value: 'basse', label: 'Basse' },
  { value: 'normale', label: 'Normale' },
  { value: 'haute', label: 'Haute' },
  { value: 'urgente', label: 'Urgente' },
]

const STATUS_LABELS: Record<TaskStatus, string> = {
  en_cours: 'En cours',
  terminee: 'Terminée',
  annulee: 'Annulée',
}

const REMINDER_OPTIONS = [5, 15, 30, 60]

function PriorityBadge({ priority }: { priority: TaskPriority }) {
  switch (priority) {
    case 'urgente':
      return <Badge variant="destructive">Urgente</Badge>
    case 'haute':
      return (
        <Badge
          variant="outline"
          className="border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300"
        >
          Haute
        </Badge>
      )
    case 'normale':
      return <Badge variant="secondary">Normale</Badge>
    case 'basse':
      return <Badge variant="outline">Basse</Badge>
  }
}

function StatusBadge({ status }: { status: TaskStatus }) {
  switch (status) {
    case 'terminee':
      return (
        <Badge
          variant="outline"
          className="border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
        >
          {STATUS_LABELS[status]}
        </Badge>
      )
    case 'annulee':
      return <Badge variant="outline">{STATUS_LABELS[status]}</Badge>
    default:
      return <Badge variant="secondary">{STATUS_LABELS[status]}</Badge>
  }
}

const emptyForm = {
  title: '',
  description: '',
  category: '',
  priority: 'normale' as TaskPriority,
  dueAt: '',
  reminderEnabled: false,
  reminderOffset: 'default',
}

export function TasksManager({
  tasks,
  tasksLoading,
  categories,
  highlightTaskId,
  onMutated,
}: TasksManagerProps) {
  const { toast } = useToast()

  const [form, setForm] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [statusFilter, setStatusFilter] = useState<'all' | TaskStatus>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null)
  const [deleting, setDeleting] = useState(false)

  const filtered = useMemo(() => {
    return tasks.filter((task) => {
      if (statusFilter !== 'all' && task.status !== statusFilter) return false
      if (categoryFilter !== 'all' && task.category !== categoryFilter) return false
      return true
    })
  }, [tasks, statusFilter, categoryFilter])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const title = form.title.trim()
    if (title.length === 0) {
      toast({ title: 'Le titre est obligatoire', variant: 'destructive' })
      return
    }
    setSubmitting(true)
    try {
      await apiFetch<{ task: Task }>('/api/tasks', {
        method: 'POST',
        body: JSON.stringify({
          title,
          ...(form.description.trim().length > 0 ? { description: form.description.trim() } : {}),
          ...(form.category.trim().length > 0 ? { category: form.category.trim() } : {}),
          priority: form.priority,
          dueAt: datetimeLocalToIso(form.dueAt),
          reminderEnabled: form.reminderEnabled,
          reminderOffsetMinutes: form.reminderEnabled
            ? form.reminderOffset === 'default'
              ? null
              : Number(form.reminderOffset)
            : null,
        }),
      })
      toast({ title: 'Tâche créée', description: `« ${title} » a été ajoutée.` })
      setForm(emptyForm)
      onMutated()
    } catch (error) {
      toast({
        title: 'Impossible de créer la tâche',
        description: error instanceof Error ? error.message : undefined,
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const updateStatus = async (task: Task, status: TaskStatus) => {
    try {
      await apiFetch<{ task: Task }>(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      })
      toast({ title: `Tâche ${status === 'terminee' ? 'terminée' : 'annulée'}`, description: task.title })
      onMutated()
    } catch (error) {
      toast({
        title: 'Impossible de modifier la tâche',
        description: error instanceof Error ? error.message : undefined,
        variant: 'destructive',
      })
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await apiFetch<{ ok: boolean }>(`/api/tasks/${deleteTarget.id}`, { method: 'DELETE' })
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
      setDeleting(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Formulaire de création */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <PlusCircle className="size-4" aria-hidden="true" />
            Nouvelle tâche
          </CardTitle>
          <CardDescription>
            Créez une tâche pour être rappelé vocalement à l&apos;approche de son échéance.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={(event) => void handleSubmit(event)} className="grid gap-4" noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="task-title">
                  Titre <span aria-hidden="true" className="text-destructive">*</span>
                </Label>
                <Input
                  id="task-title"
                  value={form.title}
                  onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                  placeholder="Ex. : préparer la revue de code"
                  required
                  maxLength={200}
                  aria-required="true"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="task-category">Catégorie</Label>
                <Input
                  id="task-category"
                  value={form.category}
                  onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
                  list="devos-categories"
                  placeholder="Ex. : dev, test, général…"
                  maxLength={50}
                />
                <datalist id="devos-categories">
                  {categories.map((category) => (
                    <option key={category} value={category} />
                  ))}
                </datalist>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="task-description">Description</Label>
              <Textarea
                id="task-description"
                value={form.description}
                onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                placeholder="Détails optionnels (2000 caractères max.)"
                rows={3}
                maxLength={2000}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="task-priority">Priorité</Label>
                <Select
                  value={form.priority}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, priority: value as TaskPriority }))}
                >
                  <SelectTrigger id="task-priority" className="w-full" aria-label="Priorité de la tâche">
                    <SelectValue placeholder="Choisir une priorité" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITY_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="task-due">Échéance (optionnelle)</Label>
                <Input
                  id="task-due"
                  type="datetime-local"
                  value={form.dueAt}
                  onChange={(event) => setForm((prev) => ({ ...prev, dueAt: event.target.value }))}
                />
              </div>
            </div>

            <div className="rounded-lg border p-3">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label htmlFor="task-reminder-switch" className="text-sm font-medium">
                    Rappel pour cette tâche
                  </Label>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Annonce vocale anticipée avant l&apos;échéance.
                  </p>
                </div>
                <Switch
                  id="task-reminder-switch"
                  checked={form.reminderEnabled}
                  onCheckedChange={(checked) => setForm((prev) => ({ ...prev, reminderEnabled: checked }))}
                  aria-label="Activer le rappel pour cette tâche"
                />
              </div>
              {form.reminderEnabled ? (
                <div className="mt-3 grid gap-2">
                  <Label htmlFor="task-reminder-offset">Délai de rappel</Label>
                  <Select
                    value={form.reminderOffset}
                    onValueChange={(value) => setForm((prev) => ({ ...prev, reminderOffset: value }))}
                  >
                    <SelectTrigger id="task-reminder-offset" className="w-full" aria-label="Délai de rappel">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Par défaut global</SelectItem>
                      {REMINDER_OPTIONS.map((minutes) => (
                        <SelectItem key={minutes} value={String(minutes)}>
                          {minutes} min avant
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
            </div>

            <Button type="submit" disabled={submitting} className="min-h-11 sm:min-h-9 sm:justify-self-start">
              {submitting ? 'Création…' : 'Créer la tâche'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Filtres */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Mes tâches</CardTitle>
          <CardDescription>
            {tasks.length} tâche{tasks.length > 1 ? 's' : ''} au total — tri par échéance puis création.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="filter-status">Filtrer par statut</Label>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as 'all' | TaskStatus)}>
              <SelectTrigger id="filter-status" className="w-full" aria-label="Filtrer par statut">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="en_cours">En cours</SelectItem>
                <SelectItem value="terminee">Terminée</SelectItem>
                <SelectItem value="annulee">Annulée</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="filter-category">Filtrer par catégorie</Label>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger id="filter-category" className="w-full" aria-label="Filtrer par catégorie">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les catégories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Liste */}
      {tasksLoading ? (
        <div className="space-y-3" aria-busy="true" aria-label="Chargement des tâches">
          {[0, 1, 2].map((index) => (
            <Skeleton key={index} className="h-24 w-full rounded-lg" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          {tasks.length === 0
            ? 'Aucune tâche pour le moment — créez-en une ci-dessus.'
            : 'Aucune tâche ne correspond aux filtres sélectionnés.'}
        </p>
      ) : (
        <ul className="devos-scroll max-h-96 space-y-3 overflow-y-auto pr-1" aria-label="Liste des tâches">
          {filtered.map((task) => {
            const closed = task.status !== 'en_cours'
            const highlighted = task.id === highlightTaskId
            return (
              <li
                key={task.id}
                className={cn(
                  'rounded-lg border bg-card p-3 shadow-xs transition-colors',
                  closed && 'opacity-60',
                  highlighted && 'border-emerald-500 ring-2 ring-emerald-500/40 bg-emerald-50/50 dark:bg-emerald-950/30',
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className={cn('text-sm font-medium leading-snug', closed && 'line-through')}>
                      {task.title}
                    </p>
                    {task.description ? (
                      <p className="mt-1 text-xs text-muted-foreground">{task.description}</p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                    <PriorityBadge priority={task.priority} />
                    <StatusBadge status={task.status} />
                    {task.category ? <Badge variant="outline">{task.category}</Badge> : null}
                  </div>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  {task.dueAt ? (
                    <span>
                      Échéance : <time dateTime={task.dueAt}>{formatDateTimeFR(task.dueAt)}</time>
                      {task.status === 'en_cours' ? (
                        <span className="ml-1 font-medium text-foreground">
                          ({formatDueRelative(task.dueAt) ?? 'échue'})
                        </span>
                      ) : null}
                    </span>
                  ) : (
                    <span>Sans échéance</span>
                  )}
                  <span aria-hidden="true">·</span>
                  <span>
                    Rappel :{' '}
                    {task.reminderEnabled
                      ? task.reminderOffsetMinutes !== null
                        ? `${task.reminderOffsetMinutes} min avant`
                        : 'par défaut global'
                      : 'désactivé'}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="min-h-11 sm:min-h-9"
                    onClick={() => void updateStatus(task, 'terminee')}
                    disabled={task.status === 'terminee'}
                    aria-label={`Terminer la tâche : ${task.title}`}
                  >
                    <Check aria-hidden="true" />
                    Terminer
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="min-h-11 sm:min-h-9"
                    onClick={() => void updateStatus(task, 'annulee')}
                    disabled={task.status === 'annulee'}
                    aria-label={`Annuler la tâche : ${task.title}`}
                  >
                    <Ban aria-hidden="true" />
                    Annuler
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="min-h-11 text-destructive hover:text-destructive sm:min-h-9"
                    onClick={() => setDeleteTarget(task)}
                    aria-label={`Supprimer la tâche : ${task.title}`}
                  >
                    <Trash2 aria-hidden="true" />
                    Supprimer
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {/* Dialog de confirmation de suppression */}
      <Dialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer cette tâche ?</DialogTitle>
            <DialogDescription>
              « {deleteTarget?.title} » sera définitivement supprimée, ainsi que ses rappels.
              Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} className="min-h-11 sm:min-h-9">
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={() => void confirmDelete()}
              disabled={deleting}
              className="min-h-11 sm:min-h-9"
            >
              {deleting ? 'Suppression…' : 'Supprimer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
