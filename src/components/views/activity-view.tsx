'use client'

/**
 * ActivityView — Journal d'activité (cahier des charges §2.C) : activité
 * générale, actions IA, historique technique, erreurs — depuis /api/activity
 * (ReminderLog réel, scopé utilisateur).
 */

import { useMemo, useState } from 'react'
import { Bot, RefreshCw } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatDateTimeFR } from '@/lib/assistant/format'
import type { ActivityEntry, ActivityFilter } from '@/types/workspace'

type ActivityTab = ActivityFilter | 'technical'

interface ActivityViewProps {
  activity: ActivityEntry[]
  loading: boolean
  onRefresh: () => Promise<void> | void
}

const TYPE_LABELS: Record<string, string> = {
  reminder: 'Rappel',
  new_task: 'Nouvelle tâche',
  deadline: 'Échéance',
  priority: 'Priorité',
}

export function ActivityView({ activity, loading, onRefresh }: ActivityViewProps) {
  const [tab, setTab] = useState<ActivityTab>('all')

  const visible = useMemo(() => {
    switch (tab) {
      case 'ia':
        return activity.filter((entry) => entry.messageSource === 'ia')
      case 'errors':
        return activity.filter((entry) => entry.status === 'echec' || entry.status === 'erreur')
      case 'technical':
        return activity.filter((entry) => entry.status !== 'annonce')
      case 'all':
      default:
        return activity
    }
  }, [activity, tab])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={tab} onValueChange={(value) => setTab(value as ActivityTab)}>
          <TabsList className="h-auto w-full flex-wrap justify-start gap-1 sm:w-fit">
            <TabsTrigger value="all" className="min-h-11 sm:min-h-9">
              Activité générale
            </TabsTrigger>
            <TabsTrigger value="ia" className="min-h-11 gap-1 sm:min-h-9">
              <Bot className="size-3.5" aria-hidden="true" />
              Actions IA
            </TabsTrigger>
            <TabsTrigger value="technical" className="min-h-11 sm:min-h-9">
              Historique technique
            </TabsTrigger>
            <TabsTrigger value="errors" className="min-h-11 sm:min-h-9">
              Erreurs
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <Button variant="outline" size="sm" className="min-h-11 sm:min-h-9" onClick={() => void onRefresh()}>
          <RefreshCw aria-hidden="true" />
          Actualiser
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2" aria-busy="true">
          {[0, 1, 2, 3].map((index) => (
            <Skeleton key={index} className="h-14 w-full" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            Aucune entrée dans cette section — l&apos;activité apparaît dès les premiers rappels.
          </CardContent>
        </Card>
      ) : (
        <ul className="devos-scroll max-h-[36rem] space-y-2 overflow-y-auto pr-1" aria-label="Journal d'activité">
          {visible.map((entry) => (
            <li key={entry.id} className="flex flex-wrap items-start justify-between gap-2 rounded-md border bg-card p-3">
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-sm">
                  <span className="font-medium">{TYPE_LABELS[entry.type] ?? entry.type}</span>
                  {entry.taskTitle ? <span className="truncate text-muted-foreground">· {entry.taskTitle}</span> : null}
                </p>
                {entry.message ? <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{entry.message}</p> : null}
                <p className="mt-1 text-xs text-muted-foreground">
                  Prévu : {formatDateTimeFR(entry.scheduledFor)}
                  {entry.firedAt ? ` · Émis : ${formatDateTimeFR(entry.firedAt)}` : ''}
                  {entry.snoozedUntil ? ` · Reporté : ${formatDateTimeFR(entry.snoozedUntil)}` : ''}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                {entry.messageSource === 'ia' ? (
                  <Badge variant="secondary" className="text-[10px]">
                    IA
                  </Badge>
                ) : null}
                <Badge
                  variant="outline"
                  className={
                    entry.status === 'annonce'
                      ? 'text-[10px]'
                      : 'border-amber-300 text-[10px] text-amber-700 dark:text-amber-300'
                  }
                >
                  {entry.status}
                </Badge>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
