'use client'

/**
 * SyncView — Synchronisation (cahier des charges §2.D) : état serveur réel
 * (/api/health), dernière synchro, architecture honnête (mono-appareil :
 * pas de file d'attente, pas de conflit en v1).
 */

import { CheckCircle2, CloudOff, RefreshCw, Server } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDateTimeFR, formatTimeFR } from '@/lib/assistant/format'
import type { ServerTickInfo } from '@/hooks/use-voice-assistant'

interface SyncViewProps {
  tick: ServerTickInfo
  onRefresh: () => Promise<void> | void
  onTickNow: () => Promise<void> | void
}

export function SyncView({ tick, onRefresh, onTickNow }: SyncViewProps) {
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Server className="size-4" aria-hidden="true" />
            État de la synchronisation
            <Badge
              variant="outline"
              className={
                tick.ok
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                  : 'border-destructive/40 text-destructive'
              }
            >
              {tick.ok ? 'Connecté' : 'Erreur'}
            </Badge>
          </CardTitle>
          <CardDescription>
            Le client interroge le serveur toutes les 30 s (tick) pour recalculer les rappels —
            architecture « état dérivé » sans file d&apos;attente locale.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="rounded-md border p-3">
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CheckCircle2 className="size-3.5 text-emerald-500" aria-hidden="true" />
                Serveur
              </p>
              <p className="mt-1 text-sm font-medium">{tick.ok ? 'Joignable' : 'Injoignable'}</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Dernière synchro</p>
              <p className="mt-1 text-sm font-medium">
                {tick.at ? formatTimeFR(tick.at) : '—'}
                {tick.now ? <span className="ml-1 text-xs text-muted-foreground">(serveur {formatDateTimeFR(tick.now)})</span> : null}
              </p>
            </div>
            <div className="rounded-md border p-3">
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CloudOff className="size-3.5" aria-hidden="true" />
                En attente / Conflits
              </p>
              <p className="mt-1 text-sm font-medium">0 · 0</p>
            </div>
          </div>
          {tick.quietHours?.active && tick.quietHours.window ? (
            <p className="rounded-md border border-zinc-300 bg-zinc-100 p-2.5 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
              Heures silencieuses en cours ({tick.quietHours.window}) — les annonces non urgentes
              sont muettées côté serveur.
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" className="min-h-11 sm:min-h-9" onClick={() => void onTickNow()}>
              <RefreshCw aria-hidden="true" />
              Synchroniser maintenant
            </Button>
            <Button variant="ghost" size="sm" className="min-h-11 sm:min-h-9" onClick={() => void onRefresh()}>
              Actualiser l&apos;état
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Historique</CardTitle>
          <CardDescription>Le journal complet des rappels est disponible dans le Journal d&apos;activité.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Fonctionnement hors ligne (priorité 8 du MVP) : les préférences vocales disposent déjà
            d&apos;un miroir localStorage ; la file d&apos;attente de mutations hors ligne arrivera avec le
            module Synchronisation complet.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
