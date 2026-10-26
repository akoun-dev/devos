'use client'

/**
 * ComingSoonView — vue générique des destinations `planned` (ADR-004 §5) :
 * affiche la structure cible, la raison du report et l'accès aux sections
 * déjà actives. Jamais de lien mort.
 */

import { Construction } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { ViewId } from '@/types/workspace'

interface ComingSoonViewProps {
  viewId: ViewId
  label: string
  description: string
  /** Sous-vues prévues par le cahier des charges (affichées comme plan). */
  plannedViews?: string[]
  actions?: string[]
}

export function ComingSoonView({ viewId, label, description, plannedViews = [], actions = [] }: ComingSoonViewProps) {
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <div
            className="mb-2 flex size-12 items-center justify-center rounded-xl border border-dashed bg-muted/50 text-muted-foreground"
            aria-hidden="true"
          >
            <Construction className="size-6" />
          </div>
          <CardTitle className="flex flex-wrap items-center gap-2 text-xl">
            {label}
            <span className="rounded-full border px-2 py-0.5 text-xs font-normal text-muted-foreground">
              Bientôt disponible
            </span>
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <p className="text-sm text-muted-foreground">
            Ce module suivra la priorisation du MVP (cahier des charges §6) : la navigation et les
            permissions sont déjà en place, seules les fonctionnalités restent à livrer — l&apos;activation
            se fera sans bouleverser la structure.
          </p>
          {plannedViews.length > 0 ? (
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Vues prévues
              </p>
              <ul className="flex flex-wrap gap-1.5" aria-label="Vues prévues pour ce module">
                {plannedViews.map((view) => (
                  <li
                    key={view}
                    className="rounded-md border bg-muted/40 px-2 py-1 text-xs text-muted-foreground"
                  >
                    {view}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {actions.length > 0 ? (
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Actions principales prévues
              </p>
              <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                {actions.map((action) => (
                  <li key={action}>{action}</li>
                ))}
              </ul>
            </div>
          ) : null}
          <p className="text-xs text-muted-foreground">
            Identifiant technique : <code className="rounded bg-muted px-1 py-0.5">{viewId}</code> — statut
            registre : <code className="rounded bg-muted px-1 py-0.5">planned</code>.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
