'use client'

/**
 * Onglet « Assistant » — tableau de bord vocal.
 * - Carte de statut (Actif / Suspendu / Heures silencieuses en cours) ;
 * - Bannière de permission notifications (FR-010 / AC-010) ;
 * - Actions : « Tester la voix », « Suspendre les annonces » ;
 * - Journal des annonces (max 50, aria-live polite, défilement stylé) avec
 *   Reporter 5 min (snooze) et Voir la tâche (bascule onglet Tâches).
 */

import { useEffect, useState } from 'react'
import {
  AlarmClock,
  BellOff,
  BellRing,
  Eye,
  PauseCircle,
  PlayCircle,
  Sparkles,
  Volume2,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { JournalEntry, ServerTickInfo } from '@/hooks/use-voice-assistant'
import { formatDateTimeFR, formatTimeFR } from '@/lib/assistant/format'
import {
  getNotificationPermission,
  requestNotificationPermission,
  type NotificationPermissionState,
} from '@/lib/assistant/notifications'
import type { AnnouncementType, VoicePreferences } from '@/types/assistant'
import { cn } from '@/lib/utils'

interface AssistantPanelProps {
  prefs: VoicePreferences | null
  prefsLoading: boolean
  announcements: JournalEntry[]
  quietHours: ServerTickInfo['quietHours']
  onSnooze: (logId: string, minutes: number) => void
  onSpeakTest: () => void
  onToggleSuspended: () => void
  onViewTask: (taskId: string) => void
}

const TYPE_CONFIG: Record<
  AnnouncementType,
  { label: string; className: string }
> = {
  reminder: {
    label: 'Rappel',
    className:
      'border-slate-600 bg-slate-800/70 text-slate-200',
  },
  new_task: {
    label: 'Nouvelle tâche',
    className: '',
  },
  deadline: {
    label: 'Échéance',
    className:
      'border-amber-400/30 bg-amber-400/10 text-amber-200',
  },
  priority: {
    label: 'Priorité',
    className:
      'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300',
  },
  automation: {
    label: 'Automatisation',
    className:
      'border-emerald-400/30 bg-emerald-400/10 text-emerald-200',
  },
}

function TypeBadge({ type, urgent }: { type: AnnouncementType; urgent: boolean }) {
  if (urgent) {
    return <Badge variant="destructive">Priorité — urgente</Badge>
  }
  if (type === 'new_task') {
    return <Badge variant="outline">Nouvelle tâche</Badge>
  }
  const config = TYPE_CONFIG[type]
  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  )
}

export function AssistantPanel({
  prefs,
  prefsLoading,
  announcements,
  quietHours,
  onSnooze,
  onSpeakTest,
  onToggleSuspended,
  onViewTask,
}: AssistantPanelProps) {
  // null au 1er rendu (SSR) pour éviter tout écart d'hydratation
  const [permission, setPermission] = useState<NotificationPermissionState | null>(null)

  useEffect(() => {
    setPermission(getNotificationPermission())
  }, [])

  const handleEnableNotifications = async () => {
    const result = await requestNotificationPermission()
    setPermission(result)
  }

  const suspended = prefs ? prefs.suspended || (prefs.suspendedUntil !== null && new Date(prefs.suspendedUntil).getTime() > Date.now()) : false

  return (
    <div className="flex flex-col gap-4">
      {/* Carte de statut */}
      <Card className="overflow-hidden border-slate-700/80 bg-[#0b2038]/90">
        <CardHeader className="border-b border-slate-700/70 bg-gradient-to-r from-indigo-500/[0.07] to-transparent pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Volume2 className="size-4" aria-hidden="true" />
            État de l&apos;assistant
          </CardTitle>
          <CardDescription>
            {prefs
              ? suspended
                ? 'Les annonces sont suspendues. Reprenez-les quand vous le souhaitez.'
                : quietHours?.active
                  ? `Plage silencieuse en cours${quietHours.window ? ` (${quietHours.window})` : ''} — les annonces sont notifiées muettement, sans rattrapage.`
                  : 'L’assistant écoute vos tâches et vous parle au bon moment.'
              : 'Chargement des préférences…'}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2">
          {prefsLoading && !prefs ? (
            <>
              <Skeleton className="h-8 w-40" />
              <Skeleton className="h-8 w-36" />
              <Skeleton className="h-8 w-36" />
            </>
          ) : (
            <>
              <Button onClick={onSpeakTest} className="min-h-11 sm:min-h-9">
                <Volume2 aria-hidden="true" />
                Tester la voix
              </Button>
              <Button
                onClick={onToggleSuspended}
                variant="outline"
                className="min-h-11 sm:min-h-9"
                aria-pressed={suspended}
                disabled={!prefs}
              >
                {suspended ? <PlayCircle aria-hidden="true" /> : <PauseCircle aria-hidden="true" />}
                {suspended ? 'Reprendre les annonces' : 'Suspendre les annonces'}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Bannière permissions notifications (FR-010 / AC-010) */}
      {permission !== null && permission !== 'granted' && permission !== 'unsupported' ? (
        <div
          role="note"
          className={cn(
            'flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between',
            permission === 'denied'
              ? 'border-amber-400/30 bg-amber-400/10'
              : 'border-emerald-400/30 bg-emerald-400/10',
          )}
        >
          <div className="flex items-start gap-3">
            {permission === 'denied' ? (
              <BellOff className="mt-0.5 size-5 shrink-0 text-amber-300" aria-hidden="true" />
            ) : (
              <BellRing className="mt-0.5 size-5 shrink-0 text-emerald-300" aria-hidden="true" />
            )}
            <div className="text-sm">
              <p className="font-medium text-foreground">
                {permission === 'denied'
                  ? 'Notifications bloquées dans votre navigateur'
                  : 'Activer les notifications visuelles ?'}
              </p>
              <p className="mt-1 text-muted-foreground">
                Les annonces vocales fonctionnent sans permission. Les notifications permettent
                simplement d&apos;être alerté visuellement — pour les recevoir, gardez cet onglet
                ouvert dans votre navigateur.
                {permission === 'denied'
                  ? ' Débloquez-les depuis les réglages du site dans votre navigateur.'
                  : ''}
              </p>
            </div>
          </div>
          {permission === 'default' ? (
            <Button onClick={() => void handleEnableNotifications()} className="min-h-11 sm:min-h-9 sm:self-center">
              <BellRing aria-hidden="true" />
              Activer
            </Button>
          ) : null}
        </div>
      ) : null}

      {/* Journal des annonces */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Journal des annonces</CardTitle>
          <CardDescription>
            Historique des 50 dernières annonces. Les annonces marquées « Silencieux » n&apos;ont
            pas été prononcées (heures silencieuses ou suspension) et ne seront jamais rejouées.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {announcements.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-600/80 bg-slate-900/20 p-6 text-center text-sm text-slate-400">
              Aucune annonce pour le moment. Les rappels, nouvelles tâches, échéances et priorités
              apparaîtront ici.
            </p>
          ) : (
            <ul
              role="log"
              aria-live="polite"
              aria-label="Journal des annonces vocales"
              className="devos-scroll max-h-96 space-y-3 overflow-y-auto pr-1"
            >
              {announcements.map(({ announcement, receivedAt }) => (
                <li
                  key={announcement.id}
                  className="rounded-xl border border-slate-700/80 bg-[#102945]/75 p-3 shadow-sm transition-colors hover:border-indigo-400/30"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <TypeBadge type={announcement.type} urgent={announcement.urgent} />
                    <time
                      dateTime={receivedAt}
                      className="text-xs text-muted-foreground"
                      title={formatDateTimeFR(receivedAt)}
                    >
                      {formatTimeFR(receivedAt)}
                    </time>
                    <Badge
                      variant={announcement.messageSource === 'ia' ? 'default' : 'outline'}
                      className="text-[11px]"
                      title={
                        announcement.messageSource === 'ia'
                          ? 'Message reformulé par l’IA'
                          : 'Message préparé à partir de vos données'
                      }
                    >
                      {announcement.messageSource === 'ia' ? (
                        <>
                          <Sparkles aria-hidden="true" /> IA
                        </>
                      ) : (
                        'Préparé'
                      )}
                    </Badge>
                    {!announcement.spoken ? (
                      <Badge className="border-zinc-300 bg-zinc-100 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                        <BellOff aria-hidden="true" /> Silencieux — non prononcée
                      </Badge>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm leading-relaxed">{announcement.message}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="min-h-11 sm:min-h-9"
                      onClick={() => onSnooze(announcement.id, 5)}
                      aria-label={`Reporter l'annonce de 5 minutes : ${announcement.title}`}
                    >
                      <AlarmClock aria-hidden="true" />
                      Reporter 5 min
                    </Button>
                    {announcement.taskId ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="min-h-11 sm:min-h-9"
                        onClick={() => onViewTask(announcement.taskId as string)}
                        aria-label={`Voir la tâche : ${announcement.title}`}
                      >
                        <Eye aria-hidden="true" />
                        Voir la tâche
                      </Button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
