'use client'

/**
 * Badges partagés des tâches (extraits de l'ancien TasksManager — DEBT-017).
 */

import { Badge } from '@/components/ui/badge'
import type { TaskPriority, TaskStatus } from '@/types/assistant'

export const STATUS_LABELS: Record<TaskStatus, string> = {
  en_cours: 'En cours',
  terminee: 'Terminée',
  annulee: 'Annulée',
}

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
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

export function StatusBadge({ status }: { status: TaskStatus }) {
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
