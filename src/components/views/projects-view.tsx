'use client'

/**
 * ProjectsView — Projets (cahier des charges §3.1) : vues liste + création +
 * détail (Dialog : vue d'ensemble, tâches liées), favoris, archivage.
 * Données réelles via /api/projects ; progression = tâches terminées/total.
 */

import { useMemo, useState } from 'react'
import { Archive, ExternalLink, FolderKanban, Github, Loader2, PlusCircle, Search, Star, Trash2 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
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
import { Textarea } from '@/components/ui/textarea'
import { PriorityBadge } from '@/components/views/tasks-badges'
import { useToast } from '@/hooks/use-toast'
import { formatDateTimeFR } from '@/lib/assistant/format'
import { cn } from '@/lib/utils'
import type { Task, TaskPriority } from '@/types/assistant'
import type { Project, ProjectStatus } from '@/types/workspace'

interface ProjectsViewProps {
  projects: Project[]
  projectsLoading: boolean
  tasks: Task[]
  loadingTasks: boolean
  onCreate: (payload: { name: string; description?: string; priority?: TaskPriority; dueAt?: string | null }) => Promise<void>
  onUpdate: (id: string, payload: Record<string, unknown>) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

const STATUS_LABELS: Record<ProjectStatus, string> = {
  actif: 'Actif',
  en_pause: 'En pause',
  termine: 'Terminé',
  archive: 'Archivé',
}

type ListFilter = 'tous' | 'favoris' | 'pause' | 'termines' | 'archives'

export function ProjectsView({
  projects,
  projectsLoading,
  tasks,
  loadingTasks,
  onCreate,
  onUpdate,
  onDelete,
}: ProjectsViewProps) {
  const { toast } = useToast()
  const [filter, setFilter] = useState<ListFilter>('tous')
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', priority: 'normale' as TaskPriority, dueAt: '' })
  const [submitting, setSubmitting] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null)
  const [busy, setBusy] = useState(false)

  const visible = useMemo(() => {
    const normalized = search.trim().toLocaleLowerCase('fr')
    return projects.filter((project) => {
      const matchesFilter =
        filter === 'favoris' ? project.favorite && project.status !== 'archive' :
        filter === 'pause' ? project.status === 'en_pause' :
        filter === 'termines' ? project.status === 'termine' :
        filter === 'archives' ? project.status === 'archive' :
        project.status !== 'archive'
      const matchesSearch = !normalized ||
        project.name.toLocaleLowerCase('fr').includes(normalized) ||
        (project.description ?? '').toLocaleLowerCase('fr').includes(normalized)
      return matchesFilter && matchesSearch
    })
  }, [projects, filter, search])

  const detail = detailId ? projects.find((project) => project.id === detailId) ?? null : null
  const detailTasks = detail ? tasks.filter((task) => task.projectId === detail.id) : []

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const name = form.name.trim()
    if (!name) return
    setSubmitting(true)
    try {
      await onCreate({
        name,
        ...(form.description.trim() ? { description: form.description.trim() } : {}),
        priority: form.priority,
        dueAt: form.dueAt ? new Date(form.dueAt).toISOString() : null,
      })
      toast({ title: 'Projet créé', description: name })
      setForm({ name: '', description: '', priority: 'normale', dueAt: '' })
      setFormOpen(false)
    } catch (error) {
      toast({
        title: 'Impossible de créer le projet',
        description: error instanceof Error ? error.message : undefined,
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleFavorite = async (project: Project) => {
    try {
      await onUpdate(project.id, { favorite: !project.favorite })
    } catch (error) {
      toast({
        title: 'Mise à jour impossible',
        description: error instanceof Error ? error.message : undefined,
        variant: 'destructive',
      })
    }
  }

  const handleArchive = async (project: Project) => {
    const next: ProjectStatus = project.status === 'archive' ? 'actif' : 'archive'
    try {
      await onUpdate(project.id, { status: next })
      toast({ title: next === 'archive' ? 'Projet archivé' : 'Projet désarchivé', description: project.name })
    } catch (error) {
      toast({
        title: 'Mise à jour impossible',
        description: error instanceof Error ? error.message : undefined,
        variant: 'destructive',
      })
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setBusy(true)
    try {
      await onDelete(deleteTarget.id)
      toast({ title: 'Projet supprimé', description: deleteTarget.name })
      setDeleteTarget(null)
      setDetailId(null)
    } catch (error) {
      toast({
        title: 'Suppression impossible',
        description: error instanceof Error ? error.message : undefined,
        variant: 'destructive',
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="grid flex-1 gap-2 sm:grid-cols-[minmax(12rem,1fr)_12rem]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher un projet…" className="h-11 pl-9" aria-label="Rechercher un projet" />
          </div>
          <Select value={filter} onValueChange={(value) => setFilter(value as ListFilter)}>
            <SelectTrigger className="h-11 w-full" aria-label="Filtrer les projets"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="tous">Tous les projets</SelectItem>
              <SelectItem value="favoris">Favoris</SelectItem>
              <SelectItem value="pause">En pause</SelectItem>
              <SelectItem value="termines">Terminés</SelectItem>
              <SelectItem value="archives">Archivés</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setFormOpen(true)} className="min-h-11 sm:min-h-9">
          <PlusCircle aria-hidden="true" />
          Nouveau projet
        </Button>
      </div>

      {projectsLoading ? (
        <div className="space-y-3" aria-busy="true">
          {[0, 1, 2].map((index) => (
            <Skeleton key={index} className="h-24 w-full rounded-lg" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            {filter === 'tous' && !search.trim()
              ? 'Aucun projet pour le moment — créez votre premier projet pour organiser vos tâches.'
              : 'Aucun projet dans cette vue.'}
          </CardContent>
        </Card>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2" aria-label="Liste des projets">
          {visible.map((project) => {
            const progress = project.taskCount > 0 ? Math.round((project.doneTaskCount / project.taskCount) * 100) : 0
            return (
              <li key={project.id} className="rounded-lg border bg-card p-4 shadow-xs">
                <div className="flex items-start justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setDetailId(project.id)}
                    className="min-w-0 flex-1 text-left"
                    aria-label={`Ouvrir le projet ${project.name}`}
                  >
                    <p className="flex items-center gap-1.5 text-sm font-medium">
                      <FolderKanban className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                      <span className="truncate">{project.name}</span>
                    </p>
                    {project.description ? (
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{project.description}</p>
                    ) : null}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleToggleFavorite(project)}
                    className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:text-amber-500"
                    aria-label={project.favorite ? `Retirer ${project.name} des favoris` : `Ajouter ${project.name} aux favoris`}
                  >
                    <Star className={cn('size-4', project.favorite && 'fill-amber-400 text-amber-400')} aria-hidden="true" />
                  </button>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <PriorityBadge priority={project.priority} />
                  <Badge
                    variant={project.status === 'actif' ? 'secondary' : 'outline'}
                    className={cn(project.status === 'en_pause' && 'border-amber-300 text-amber-700 dark:text-amber-300')}
                  >
                    {STATUS_LABELS[project.status]}
                  </Badge>
                  {project.dueAt ? <span className="text-xs text-muted-foreground">{formatDateTimeFR(project.dueAt)}</span> : null}
                </div>

                {project.sourceRepositoryUrl ? (
                  <a href={project.sourceRepositoryUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex min-h-11 max-w-full items-center gap-2 rounded-md border px-3 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                    <Github className="size-3.5 shrink-0" aria-hidden="true" />
                    <span className="truncate">Dépôt GitHub associé</span>
                    <ExternalLink className="size-3 shrink-0" aria-hidden="true" />
                  </a>
                ) : null}

                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {project.doneTaskCount}/{project.taskCount} tâche{project.taskCount > 1 ? 's' : ''}
                    </span>
                    <span>{progress} %</span>
                  </div>
                  <div
                    className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted"
                    role="progressbar"
                    aria-valuenow={progress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`Progression du projet ${project.name}`}
                  >
                    <div className="h-full rounded-full bg-emerald-500" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {/* Formulaire de création */}
      <Dialog open={formOpen} onOpenChange={(open) => !submitting && setFormOpen(open)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nouveau projet</DialogTitle>
            <DialogDescription>Organisez vos tâches autour d&apos;un objectif.</DialogDescription>
          </DialogHeader>
          <form onSubmit={(event) => void handleCreate(event)} className="grid gap-4" noValidate>
            <div className="grid gap-2">
              <Label htmlFor="project-name">
                Nom <span aria-hidden="true" className="text-destructive">*</span>
              </Label>
              <Input
                id="project-name"
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="Ex. : Application mobile DevOS"
                required
                maxLength={120}
                aria-required="true"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="project-description">Description</Label>
              <Textarea
                id="project-description"
                value={form.description}
                onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                rows={2}
                maxLength={2000}
                placeholder="Objectif, périmètre…"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="project-priority">Priorité</Label>
                <Select
                  value={form.priority}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, priority: value as TaskPriority }))}
                >
                  <SelectTrigger id="project-priority" className="w-full" aria-label="Priorité du projet">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basse">Basse</SelectItem>
                    <SelectItem value="normale">Normale</SelectItem>
                    <SelectItem value="haute">Haute</SelectItem>
                    <SelectItem value="urgente">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="project-due">Échéance (optionnelle)</Label>
                <Input
                  id="project-due"
                  type="datetime-local"
                  value={form.dueAt}
                  onChange={(event) => setForm((prev) => ({ ...prev, dueAt: event.target.value }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)} disabled={submitting} className="min-h-11 sm:min-h-9">
                Annuler
              </Button>
              <Button type="submit" disabled={submitting} className="min-h-11 sm:min-h-9">
                {submitting ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
                Créer le projet
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Détail du projet */}
      <Dialog open={detail !== null} onOpenChange={(open) => !open && setDetailId(null)}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          {detail ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex flex-wrap items-center gap-2">
                  {detail.name}
                  <PriorityBadge priority={detail.priority} />
                </DialogTitle>
                <DialogDescription>{detail.description ?? 'Aucune description.'}</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4">
                <div className="grid grid-cols-3 gap-2 text-center text-sm">
                  <div className="rounded-md border p-2">
                    <p className="text-lg font-semibold">{detail.taskCount}</p>
                    <p className="text-xs text-muted-foreground">Tâches</p>
                  </div>
                  <div className="rounded-md border p-2">
                    <p className="text-lg font-semibold">{detail.doneTaskCount}</p>
                    <p className="text-xs text-muted-foreground">Terminées</p>
                  </div>
                  <div className="rounded-md border p-2">
                    <p className="text-lg font-semibold">{detail.taskCount - detail.doneTaskCount}</p>
                    <p className="text-xs text-muted-foreground">Restantes</p>
                  </div>
                </div>
                {detail.sourceRepositoryUrl ? (
                  <div className="rounded-lg border p-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Dépôt lié</p>
                    <a href={detail.sourceRepositoryUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 break-all text-sm text-primary underline-offset-4 hover:underline">
                      <Github className="size-4 shrink-0" aria-hidden="true" />
                      {detail.sourceRepositoryUrl}
                      <ExternalLink className="size-3.5 shrink-0" aria-hidden="true" />
                    </a>
                    {detail.sourceDefaultBranch ? <p className="mt-1 text-xs text-muted-foreground">Branche par défaut : {detail.sourceDefaultBranch}</p> : null}
                  </div>
                ) : null}
                <div>
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Tâches liées
                  </p>
                  {loadingTasks ? (
                    <Skeleton className="h-16 w-full" />
                  ) : detailTasks.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Aucune tâche rattachée — créez-en une depuis l&apos;onglet Tâches en choisissant ce projet.
                    </p>
                  ) : (
                    <ul className="devos-scroll max-h-40 space-y-1.5 overflow-y-auto pr-1 text-sm" aria-label="Tâches du projet">
                      {detailTasks.map((task) => (
                        <li key={task.id} className="flex items-center justify-between gap-2 rounded-md border p-2">
                          <span className={cn('min-w-0 flex-1 truncate', task.status !== 'en_cours' && 'line-through opacity-60')}>
                            {task.title}
                          </span>
                          <Badge variant="outline" className="shrink-0 text-[10px]">
                            {task.status === 'en_cours' ? 'En cours' : task.status === 'terminee' ? 'Terminée' : 'Annulée'}
                          </Badge>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="min-h-11 sm:min-h-9"
                    onClick={() => void handleArchive(detail)}
                  >
                    <Archive aria-hidden="true" />
                    {detail.status === 'archive' ? 'Désarchiver' : 'Archiver'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="min-h-11 text-destructive hover:text-destructive sm:min-h-9"
                    onClick={() => setDeleteTarget(detail)}
                  >
                    <Trash2 aria-hidden="true" />
                    Supprimer le projet
                  </Button>
                </div>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Confirmation suppression */}
      <Dialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer ce projet ?</DialogTitle>
            <DialogDescription>
              « {deleteTarget?.name} » sera supprimé. Les tâches et notes liées seront conservées
              mais détachées du projet. Cette action est irréversible.
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
