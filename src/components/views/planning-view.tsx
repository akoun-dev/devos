'use client'

/**
 * PlanningView — calendrier mensuel des tâches (cahier des charges §3.2
 * « Calendrier ») : grille 7 colonnes, pastilles par échéance, navigation
 * mois précédent/suivant, liste du jour sélectionné. Données réelles /api/tasks.
 */

import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { PriorityBadge } from '@/components/views/tasks-badges'
import { formatDateTimeFR } from '@/lib/assistant/format'
import { cn } from '@/lib/utils'
import type { Task } from '@/types/assistant'

interface PlanningViewProps {
  tasks: Task[]
  loading: boolean
}

const WEEKDAYS = ['lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.', 'dim.']

const MONTH_FORMATTER = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' })
const DAY_FORMATTER = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  )
}

export function PlanningView({ tasks, loading }: PlanningViewProps) {
  const [cursor, setCursor] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [selected, setSelected] = useState<Date>(() => new Date())

  const cells = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
    // Lundi = début de semaine (fr) : offset (getDay()+6)%7
    const offset = (first.getDay() + 6) % 7
    const start = new Date(first)
    start.setDate(first.getDate() - offset)
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start)
      date.setDate(start.getDate() + index)
      return date
    })
  }, [cursor])

  const tasksByDay = useMemo(() => {
    const map = new Map<string, Task[]>()
    for (const task of tasks) {
      if (!task.dueAt) continue
      const date = new Date(task.dueAt)
      const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
      const list = map.get(key) ?? []
      list.push(task)
      map.set(key, list)
    }
    return map
  }, [tasks])

  const selectedTasks = useMemo(
    () => tasks.filter((task) => task.dueAt && sameDay(new Date(task.dueAt), selected)),
    [tasks, selected]
  )

  const monthLabel = MONTH_FORMATTER.format(cursor)
  const today = new Date()

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold capitalize sm:text-base" aria-live="polite">
          {monthLabel}
        </h2>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="size-11 sm:size-9"
            onClick={() => setCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
            aria-label="Mois précédent"
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="min-h-11 sm:min-h-9"
            onClick={() => {
              setCursor(new Date(today.getFullYear(), today.getMonth(), 1))
              setSelected(new Date())
            }}
          >
            Aujourd&apos;hui
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="size-11 sm:size-9"
            onClick={() => setCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
            aria-label="Mois suivant"
          >
            <ChevronRight className="size-4" aria-hidden="true" />
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-2 sm:p-3">
          <div className="grid grid-cols-7 gap-1" role="grid" aria-label={`Calendrier ${monthLabel}`}>
            {WEEKDAYS.map((day) => (
              <div key={day} className="pb-1 text-center text-[11px] font-medium text-muted-foreground" role="columnheader">
                {day}
              </div>
            ))}
            {cells.map((date) => {
              const inMonth = date.getMonth() === cursor.getMonth()
              const isToday = sameDay(date, today)
              const isSelected = sameDay(date, selected)
              const dayTasks = tasksByDay.get(`${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`) ?? []
              return (
                <button
                  key={date.toISOString()}
                  type="button"
                  onClick={() => setSelected(date)}
                  aria-label={`${DAY_FORMATTER.format(date)} — ${dayTasks.length} tâche(s)`}
                  aria-pressed={isSelected}
                  className={cn(
                    'flex min-h-16 flex-col items-start gap-0.5 rounded-md border p-1 text-left transition-colors sm:min-h-20 sm:p-1.5',
                    inMonth ? 'bg-card' : 'bg-muted/30 text-muted-foreground',
                    isSelected && 'border-emerald-500 ring-1 ring-emerald-500/50',
                    !isSelected && 'hover:bg-muted/60'
                  )}
                >
                  <span
                    className={cn(
                      'flex size-5 items-center justify-center rounded-full text-[11px] font-medium',
                      isToday && 'bg-emerald-500 text-white',
                      !isToday && isSelected && 'bg-primary/10 text-primary'
                    )}
                  >
                    {date.getDate()}
                  </span>
                  {dayTasks.slice(0, 3).map((task) => (
                    <span
                      key={task.id}
                      className={cn(
                        'w-full truncate rounded px-1 text-[10px] leading-4',
                        task.status !== 'en_cours'
                          ? 'bg-muted text-muted-foreground line-through'
                          : task.priority === 'urgente'
                            ? 'bg-destructive/15 text-destructive'
                            : task.priority === 'haute'
                              ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                              : 'bg-muted text-foreground'
                      )}
                    >
                      {task.title}
                    </span>
                  ))}
                  {dayTasks.length > 3 ? (
                    <span className="px-1 text-[10px] text-muted-foreground">+{dayTasks.length - 3}</span>
                  ) : null}
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Tâches du jour sélectionné */}
      <Card>
        <CardContent className="p-4">
          <h3 className="mb-2 text-sm font-semibold capitalize">{DAY_FORMATTER.format(selected)}</h3>
          {loading ? (
            <p className="text-sm text-muted-foreground">Chargement…</p>
          ) : selectedTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune tâche échéant ce jour.</p>
          ) : (
            <ul className="space-y-2" aria-label={`Tâches du ${DAY_FORMATTER.format(selected)}`}>
              {selectedTasks.map((task) => (
                <li key={task.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-2">
                  <span className={cn('min-w-0 flex-1 truncate text-sm', task.status !== 'en_cours' && 'line-through opacity-60')}>
                    {task.title}
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <PriorityBadge priority={task.priority} />
                    <span className="text-xs text-muted-foreground">{formatDateTimeFR(task.dueAt)}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
