'use client'

/**
 * NotesView — Documents & Notes (cahier des charges §2.A) : création/édition
 * (Dialog), recherche, favoris, association à un projet, corbeille
 * (trashed → restauration ou suppression définitive). Données réelles.
 */

import { useMemo, useState } from 'react'
import { FileText, Loader2, PlusCircle, Search, Star, Trash2, Undo2 } from 'lucide-react'

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
import { useToast } from '@/hooks/use-toast'
import { formatDateTimeFR } from '@/lib/assistant/format'
import { cn } from '@/lib/utils'
import type { Note } from '@/types/workspace'

interface NotesViewProps {
  notes: Note[]
  notesLoading: boolean
  projects: { id: string; name: string }[]
  onCreate: (payload: { title: string; content?: string; projectId?: string | null }) => Promise<void>
  onUpdate: (id: string, payload: Record<string, unknown>) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

type Scope = 'tous' | 'favoris' | 'corbeille'

const emptyForm = { title: '', content: '', projectId: 'none' }

export function NotesView({ notes, notesLoading, projects, onCreate, onUpdate, onDelete }: NotesViewProps) {
  const { toast } = useToast()
  const [scope, setScope] = useState<Scope>('tous')
  const [search, setSearch] = useState('')
  const [editorOpen, setEditorOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Note | null>(null)
  const [busy, setBusy] = useState(false)

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase()
    return notes.filter((note) => {
      if (scope === 'favoris' && (!note.favorite || note.trashed)) return false
      if (scope === 'corbeille' ? !note.trashed : note.trashed) return false
      if (query && !`${note.title} ${note.content}`.toLowerCase().includes(query)) return false
      return true
    })
  }, [notes, scope, search])

  const openEditor = (note?: Note) => {
    if (note) {
      setEditingId(note.id)
      setForm({ title: note.title, content: note.content, projectId: note.projectId ?? 'none' })
    } else {
      setEditingId(null)
      setForm(emptyForm)
    }
    setEditorOpen(true)
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const title = form.title.trim()
    if (!title) return
    setSubmitting(true)
    try {
      const projectId = form.projectId === 'none' ? null : form.projectId
      if (editingId) {
        await onUpdate(editingId, { title, content: form.content, projectId })
        toast({ title: 'Note mise à jour' })
      } else {
        await onCreate({ title, content: form.content, projectId })
        toast({ title: 'Note créée' })
      }
      setEditorOpen(false)
      setForm(emptyForm)
      setEditingId(null)
    } catch (error) {
      toast({
        title: 'Enregistrement impossible',
        description: error instanceof Error ? error.message : undefined,
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setBusy(true)
    try {
      await onDelete(deleteTarget.id)
      toast({ title: 'Note supprimée définitivement' })
      setDeleteTarget(null)
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
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Rechercher dans les notes…"
            className="pl-9"
            aria-label="Rechercher dans les notes"
          />
        </div>
        <Select value={scope} onValueChange={(value) => setScope(value as Scope)}>
          <SelectTrigger className="w-full sm:w-40" aria-label="Filtrer les notes">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tous">Toutes</SelectItem>
            <SelectItem value="favoris">Favoris</SelectItem>
            <SelectItem value="corbeille">Corbeille</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={() => openEditor()} className="min-h-11 sm:min-h-9" disabled={scope === 'corbeille'}>
          <PlusCircle aria-hidden="true" />
          Nouvelle note
        </Button>
      </div>

      {notesLoading ? (
        <div className="space-y-3" aria-busy="true">
          {[0, 1].map((index) => (
            <Skeleton key={index} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            {scope === 'corbeille'
              ? 'La corbeille est vide.'
              : 'Aucune note — rédigez votre premier document, note technique ou idée.'}
          </CardContent>
        </Card>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2" aria-label="Liste des notes">
          {visible.map((note) => (
            <li key={note.id} className="flex flex-col rounded-lg border bg-card p-4 shadow-xs">
              <div className="flex items-start justify-between gap-2">
                <button
                  type="button"
                  onClick={() => (note.trashed ? undefined : openEditor(note))}
                  className="min-w-0 flex-1 text-left"
                  aria-label={note.trashed ? note.title : `Modifier ${note.title}`}
                >
                  <p className="flex items-center gap-1.5 text-sm font-medium">
                    <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <span className="truncate">{note.title}</span>
                  </p>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {note.content || 'Note vide.'}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => void onUpdate(note.id, { favorite: !note.favorite })}
                  className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:text-amber-500"
                  aria-label={note.favorite ? `Retirer ${note.title} des favoris` : `Ajouter ${note.title} aux favoris`}
                >
                  <Star className={cn('size-4', note.favorite && 'fill-amber-400 text-amber-400')} aria-hidden="true" />
                </button>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                {note.projectName ? <Badge variant="outline" className="text-[10px]">{note.projectName}</Badge> : null}
                <span>{formatDateTimeFR(note.updatedAt)}</span>
                {note.trashed ? (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-auto min-h-9 px-2 text-xs"
                      onClick={() => void onUpdate(note.id, { trashed: false })}
                    >
                      <Undo2 aria-hidden="true" />
                      Restaurer
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="min-h-9 px-2 text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget(note)}
                    >
                      <Trash2 aria-hidden="true" />
                      Supprimer
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-auto min-h-9 px-2 text-muted-foreground hover:text-destructive"
                    onClick={() => void onUpdate(note.id, { trashed: true })}
                    aria-label={`Mettre ${note.title} à la corbeille`}
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Éditeur */}
      <Dialog open={editorOpen} onOpenChange={(open) => !submitting && setEditorOpen(open)}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Modifier la note' : 'Nouvelle note'}</DialogTitle>
            <DialogDescription>
              Documentation technique, idées, comptes rendus — associez-la à un projet si besoin.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(event) => void handleSubmit(event)} className="grid gap-4" noValidate>
            <div className="grid gap-2">
              <Label htmlFor="note-title">
                Titre <span aria-hidden="true" className="text-destructive">*</span>
              </Label>
              <Input
                id="note-title"
                value={form.title}
                onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                placeholder="Ex. : Décision d'architecture — auth"
                required
                maxLength={160}
                aria-required="true"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="note-project">Projet associé</Label>
              <Select value={form.projectId} onValueChange={(value) => setForm((prev) => ({ ...prev, projectId: value }))}>
                <SelectTrigger id="note-project" className="w-full" aria-label="Projet associé">
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
            <div className="grid gap-2">
              <Label htmlFor="note-content">Contenu</Label>
              <Textarea
                id="note-content"
                value={form.content}
                onChange={(event) => setForm((prev) => ({ ...prev, content: event.target.value }))}
                rows={8}
                maxLength={50_000}
                placeholder="Rédigez librement (50 000 caractères max.)"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditorOpen(false)} disabled={submitting} className="min-h-11 sm:min-h-9">
                Annuler
              </Button>
              <Button type="submit" disabled={submitting} className="min-h-11 sm:min-h-9">
                {submitting ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
                {editingId ? 'Enregistrer' : 'Créer la note'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirmation suppression définitive */}
      <Dialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer définitivement ?</DialogTitle>
            <DialogDescription>
              « {deleteTarget?.title} » sera définitivement supprimée. Cette action est irréversible.
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
