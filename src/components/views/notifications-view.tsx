'use client'

/**
 * NotificationsView — Notifications (cahier des charges §2.D) : permission du
 * navigateur, préférences (liens vers Paramètres), dernières notifications
 * de la session. Données réelles (Notification API + journal client).
 */

import { Bell, BellRing, ExternalLink, Volume2, XCircle } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatTimeFR } from '@/lib/assistant/format'
import type { JournalEntry } from '@/hooks/use-voice-assistant'
import type { VoicePreferences } from '@/types/assistant'
import type { ViewId } from '@/types/workspace'

interface NotificationsViewProps {
  permission: NotificationPermission | 'unsupported'
  announcements: JournalEntry[]
  prefs: VoicePreferences | null
  onRequestPermission: () => void
  onNavigate: (view: ViewId) => void
}

export function NotificationsView({
  permission,
  announcements,
  prefs,
  onRequestPermission,
  onNavigate,
}: NotificationsViewProps) {
  const enabled = prefs?.enabled ?? null

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="size-4" aria-hidden="true" />
            Notifications visuelles du navigateur
          </CardTitle>
          <CardDescription>
            Les annonces vocales fonctionnent sans permission ; les notifications visuelles alertent
            discrètement même quand l&apos;onglet est en arrière-plan.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <Badge
            variant="outline"
            className={
              permission === 'granted'
                ? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                : permission === 'denied'
                  ? 'border-destructive/40 text-destructive'
                  : ''
            }
          >
            {permission === 'granted'
              ? 'Accordée'
              : permission === 'denied'
                ? 'Refusée (réglages navigateur)'
                : permission === 'unsupported'
                  ? 'Non supportée'
                  : 'Non demandée'}
          </Badge>
          {permission === 'default' ? (
            <Button onClick={onRequestPermission} className="min-h-11 sm:min-h-9">
              <BellRing aria-hidden="true" />
              Activer les notifications
            </Button>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Volume2 className="size-4" aria-hidden="true" />
            Préférences de rappel
          </CardTitle>
          <CardDescription>Configuration des annonces vocales et des heures silencieuses</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm">
          <div className="flex items-center justify-between rounded-md border p-2.5">
            <span>Annonces vocales</span>
            <Badge variant={enabled === false ? 'outline' : 'secondary'}>
              {enabled === null ? 'Chargement…' : enabled ? 'Actives' : 'Suspendues'}
            </Badge>
          </div>
          <div className="flex items-center justify-between rounded-md border p-2.5">
            <span>Heures silencieuses</span>
            <Badge variant="secondary">
              {prefs ? (prefs.quietHoursEnabled ? `${prefs.quietStart} → ${prefs.quietEnd}` : 'Désactivées') : '…'}
            </Badge>
          </div>
          <Button variant="outline" size="sm" className="mt-1 min-h-11 justify-start sm:min-h-9" onClick={() => onNavigate('settings')}>
            Ouvrir les Paramètres
            <ExternalLink aria-hidden="true" />
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Dernières notifications de la session</CardTitle>
          <CardDescription>{announcements.length} annonce(s) reçue(s)</CardDescription>
        </CardHeader>
        <CardContent>
          {announcements.length === 0 ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <XCircle className="size-4" aria-hidden="true" />
              Rien pour le moment — les rappels du scheduler apparaîtront ici.
            </p>
          ) : (
            <ul className="devos-scroll max-h-48 space-y-1.5 overflow-y-auto pr-1 text-sm" aria-label="Notifications récentes">
              {announcements.map((entry) => (
                <li key={entry.announcement.id} className="flex items-center justify-between gap-2">
                  <span className="line-clamp-1 flex-1">{entry.announcement.message}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{formatTimeFR(entry.receivedAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
