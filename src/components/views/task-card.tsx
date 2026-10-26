'use client'

/**
 * TaskCard — carte d'une tâche : badges, échéance relative, projet, actions
 * (terminer / annuler / supprimer). Utilisée par les smart views de TasksView.
 */

import { Ban, Check, FolderKanban, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { PriorityBadge, StatusBadge } from '@/components/views/tasks-badges'
import { formatDateTimeFR, formatDueRelative } from '@/lib/assistant/format'
import { cn } from '@/lib/utils'
import type { Task, TaskStatus } from '@/types/assistant'

interface TaskCardProps {
  task: Task
  highlighted?: boolean
  onSetStatus: (task: Task, status: TaskStatus) => void
  onRequestDelete: (task: Task) => void
  busy?: boolean
}

export function TaskCard({ task, highlighted = false, onSetStatus, onRequestDelete, busy = false }: TaskCardProps) {
  const closed = task.status !== 'en_cours'
  const overdue = task.status === 'en_cours' && task.dueAt !== null && new Date(task.dueAt).getTime() < Date.now()

  return (
    <li
      className={cn(
        'rounded-lg border bg-card p-3 shadow-xs transition-colors',
        closed && 'opacity-60',
        overdue && 'border-destructive/40',
        highlighted && 'border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/40 dark:bg-emerald-950/30'
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className={cn('text-sm font-medium leading-snug', closed && 'line-through')}>{task.title}</p>
          {task.description ? (
            <p className="mt-1 text-xs text-muted-foreground">{task.description}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
          <PriorityBadge priority={task.priority} />
          <StatusBadge status={task.status} />
          {task.category ? <span className="rounded-md border bg-muted/40 px-1.5 py-0.5 text-xs">{task.category}</span> : null}
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        {task.dueAt ? (
          <span className={cn(overdue && 'font-medium text-destructive')}>
            Échéance :{' '}
            <time dateTime={task.dueAt}>{formatDateTimeFR(task.dueAt)}</time>
            {task.status === 'en_cours' ? (
              <span className="ml-1 font-medium text-foreground">
                ({overdue ? 'en retard' : formatDueRelative(task.dueAt) ?? 'échue'})
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
        {task.projectName ? (
          <>
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1">
              <FolderKanban className="size-3" aria-hidden="true" />
              {task.projectName}
            </span>
          </>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="min-h-11 sm:min-h-9"
          onClick={() => onSetStatus(task, 'terminee')}
          disabled={task.status === 'terminee' || busy}
          aria-label={`Terminer la tâche : ${task.title}`}
        >
          <Check aria-hidden="true" />
          Terminer
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="min-h-11 sm:min-h-9"
          onClick={() => onSetStatus(task, 'annulee')}
          disabled={task.status === 'annulee' || busy}
          aria-label={`Annuler la tâche : ${task.title}`}
        >
          <Ban aria-hidden="true" />
          Annuler
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="min-h-11 text-destructive hover:text-destructive sm:min-h-9"
          onClick={() => onRequestDelete(task)}
          disabled={busy}
          aria-label={`Supprimer la tâche : ${task.title}`}
        >
          <Trash2 aria-hidden="true" />
          Supprimer
        </Button>
      </div>
    </li>
  )
}
