'use client'

/**
 * TaskFormDialog — création de tâche (adapté de l'ancien TasksManager) dans un
 * Dialog. Ajout FEATURE-UI-SHELL : rattachement optionnel à un projet.
 */

import { useState } from 'react'
import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
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
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { datetimeLocalToIso } from '@/lib/assistant/format'
import type { Project } from '@/types/workspace'
import type { TaskPriority } from '@/types/assistant'

interface TaskFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projects: Project[]
  categories: string[]
  /** Projet présélectionné (création depuis la fiche d'un projet). */
  defaultProjectId?: string | null
  onCreate: (payload: {
    title: string
    description?: string
    category?: string
    priority: TaskPriority
    dueAt: string | null
    reminderEnabled: boolean
    reminderOffsetMinutes: number | null
    projectId?: string | null
  }) => Promise<void>
}

const PRIORITY_OPTIONS: { value: TaskPriority; label: string }[] = [
  { value: 'basse', label: 'Basse' },
  { value: 'normale', label: 'Normale' },
  { value: 'haute', label: 'Haute' },
  { value: 'urgente', label: 'Urgente' },
]

const REMINDER_OPTIONS = [5, 15, 30, 60]

const emptyForm = {
  title: '',
  description: '',
  category: '',
  priority: 'normale' as TaskPriority,
  dueAt: '',
  reminderEnabled: false,
  reminderOffset: 'default',
  projectId: 'none',
}

export function TaskFormDialog({
  open,
  onOpenChange,
  projects,
  categories,
  defaultProjectId = null,
  onCreate,
}: TaskFormDialogProps) {
  const [form, setForm] = useState({ ...emptyForm, projectId: defaultProjectId ?? 'none' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const title = form.title.trim()
    if (title.length === 0) {
      setError('Le titre est obligatoire.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await onCreate({
        title,
        ...(form.description.trim() ? { description: form.description.trim() } : {}),
        ...(form.category.trim() ? { category: form.category.trim() } : {}),
        priority: form.priority,
        dueAt: datetimeLocalToIso(form.dueAt),
        reminderEnabled: form.reminderEnabled,
        reminderOffsetMinutes: form.reminderEnabled
          ? form.reminderOffset === 'default'
            ? null
            : Number(form.reminderOffset)
          : null,
        projectId: form.projectId === 'none' ? null : form.projectId,
      })
      setForm({ ...emptyForm, projectId: defaultProjectId ?? 'none' })
      onOpenChange(false)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Création impossible.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !submitting && onOpenChange(next)}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nouvelle tâche</DialogTitle>
          <DialogDescription>
            Créez une tâche pour être rappelé vocalement à l&apos;approche de son échéance.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={(event) => void handleSubmit(event)} className="grid gap-4" noValidate>
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

          <div className="grid gap-4 sm:grid-cols-2">
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
            <div className="grid gap-2">
              <Label htmlFor="task-project">Projet (optionnel)</Label>
              <Select
                value={form.projectId}
                onValueChange={(value) => setForm((prev) => ({ ...prev, projectId: value }))}
              >
                <SelectTrigger id="task-project" className="w-full" aria-label="Projet rattaché">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucun projet</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
              className="min-h-11 sm:min-h-9"
            >
              Annuler
            </Button>
            <Button type="submit" disabled={submitting} className="min-h-11 sm:min-h-9">
              {submitting ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
              Créer la tâche
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
