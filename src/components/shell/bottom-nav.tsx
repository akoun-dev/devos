'use client'

/**
 * BottomNav — barre de navigation inférieure mobile (cahier des charges §5) :
 * 5 destinations principales (Accueil, Projets, Tâches, Assistant, Plus).
 * « Plus » ouvre le tiroir complet (Sheet piloté par AppShell via openDrawer).
 * Cachée en lg+ (sidebar fixe). Cibles tactiles ≥ 44 px.
 */

import { useMemo } from 'react'
import { MoreHorizontal } from 'lucide-react'

import { cn } from '@/lib/utils'
import type { ViewId } from '@/types/workspace'
import type { NavItem } from '@/lib/navigation'

interface BottomNavProps {
  items: NavItem[]
  currentView: ViewId
  onNavigate: (view: ViewId) => void
  /** Ouvre le tiroir de navigation complet (géré par AppShell). */
  onMore: () => void
}

export function BottomNav({ items, currentView, onNavigate, onMore }: BottomNavProps) {
  const visible = useMemo(() => items.slice(0, 4), [items])

  return (
    <nav
      aria-label="Navigation mobile"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/85 lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {visible.map((item) => {
          const Icon = item.icon
          const isActive = item.id === currentView
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onNavigate(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'flex min-h-14 w-full flex-col items-center justify-center gap-0.5 px-1 py-2 text-[11px] transition-colors',
                  isActive ? 'font-medium text-primary' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className="size-5" aria-hidden="true" />
                <span className="max-w-full truncate">{item.label.split(' ')[0]}</span>
              </button>
            </li>
          )
        })}
        {/* 5ᵉ destination « Plus » : toujours présente — ouvre le tiroir complet (cahier des charges §5). */}
        <li>
          <button
            type="button"
            onClick={onMore}
            aria-label="Plus de sections"
            className={cn(
              'flex min-h-14 w-full flex-col items-center justify-center gap-0.5 px-1 py-2 text-[11px] transition-colors',
              !visible.some((item) => item.id === currentView)
                ? 'font-medium text-primary'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <MoreHorizontal className="size-5" aria-hidden="true" />
            <span>Plus</span>
          </button>
        </li>
      </ul>
    </nav>
  )
}
