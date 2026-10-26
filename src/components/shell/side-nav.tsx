'use client'

/**
 * SideNav — contenu de navigation généré depuis le registre central
 * (src/lib/navigation.ts). Utilisé par la sidebar desktop ET le tiroir mobile
 * (Sheet) : aucune duplication de structure de menus (ADR-004 §2).
 *
 * Deux rendus :
 *  - SideNav : destinations ACTIVES autorisées pour le rôle (matrice permissions) ;
 *  - PlannedNav : destinations `planned` — visibles, non actives, badge « Bientôt »
 *    (structure cible affichée, jamais de lien mort — ADR-004 §5).
 */

import { Sparkles } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { NAV_SECTIONS, accessibleSections } from '@/lib/navigation'
import { cn } from '@/lib/utils'
import type { Role, ViewId } from '@/types/workspace'

interface SideNavProps {
  currentView: ViewId
  role: Role
  onNavigate: (view: ViewId) => void
}

export function SideNav({ currentView, role, onNavigate }: SideNavProps) {
  const sections = accessibleSections(role)

  return (
    <nav aria-label="Navigation principale" className="flex flex-col gap-5 py-1">
      {sections.map((section) => (
        <div key={section.id} className="flex flex-col gap-1">
          <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {section.label}
          </p>
          {section.items.map((item) => {
            const Icon = item.icon
            const isActive = item.id === currentView
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'group flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors',
                  isActive
                    ? 'bg-primary/10 font-medium text-primary'
                    : 'text-foreground/80 hover:bg-muted hover:text-foreground'
                )}
              >
                <Icon
                  className={cn(
                    'size-4 shrink-0',
                    isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                  )}
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                {item.id === 'ai-chat' ? (
                  <Sparkles className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                ) : null}
              </button>
            )
          })}
        </div>
      ))}
    </nav>
  )
}

export function PlannedNav({ onNavigate }: { onNavigate: (view: ViewId) => void }) {
  const planned = NAV_SECTIONS.flatMap((section) =>
    section.items.filter((item) => item.status === 'planned')
  )
  if (planned.length === 0) return null

  return (
    <div className="flex flex-col gap-1 border-t pt-4">
      <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        À venir
      </p>
      {planned.map((item) => {
        const Icon = item.icon
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onNavigate(item.id)}
            className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-muted-foreground/70 transition-colors hover:bg-muted/60"
          >
            <Icon className="size-4 shrink-0" aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate">{item.label}</span>
            <Badge variant="outline" className="shrink-0 px-1.5 py-0 text-[10px] text-muted-foreground">
              Bientôt
            </Badge>
          </button>
        )
      })}
    </div>
  )
}
