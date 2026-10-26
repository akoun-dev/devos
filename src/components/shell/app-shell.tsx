'use client'

/**
 * AppShell — enveloppe layout du shell DevOS (FEATURE-UI-SHELL, ADR-004).
 *
 * - Desktop (lg+) : sidebar fixe (registre central), contenu en PLEINE LARGEUR (w-full) ;
 * - Mobile : header (menu → tiroir Sheet) = SEULE navigation (barre inférieure
 *   retirée — décision CTO TASK-020 / amendement ADR-004 §4) ;
 * - Header : titre de la vue, badge assistant, horloge, identité + déconnexion ;
 * - Footer sticky conservé (synchro, heures silencieuses).
 */

import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { LogOut, Menu, Volume2 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { PlannedNav, SideNav } from '@/components/shell/side-nav'
import { FloatingAssistant } from '@/components/assistant/floating-assistant'
import { findNavItem } from '@/lib/navigation'
import { cn } from '@/lib/utils'
import type { AuthUser } from '@/types/assistant'
import type { Role, ViewId } from '@/types/workspace'

interface AppShellProps {
  user: AuthUser
  role: Role
  currentView: ViewId
  onNavigate: (view: ViewId) => void
  /** Statut de l'assistant vocal (badge header + footer). */
  statusConfig: { label: string; className: string; dot: string } | null
  clock: string
  serverOk: boolean
  lastTickLabel: string | null
  quietWindow: string | null
  onLogout: () => void
  children: ReactNode
}

export function AppShell({
  user,
  role,
  currentView,
  onNavigate,
  statusConfig,
  clock,
  serverOk,
  lastTickLabel,
  quietWindow,
  onLogout,
  children,
}: AppShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const item = findNavItem(currentView)
  const title = item?.label ?? 'DevOS'
  const description = item?.description ?? 'Personal Development OS'

  const navigate = useCallback(
    (view: ViewId) => {
      onNavigate(view)
      setDrawerOpen(false)
    },
    [onNavigate]
  )

  const initials = useMemo(() => {
    const source = (user.name ?? user.email).trim()
    const parts = source.split(/[\s@._-]+/).filter(Boolean)
    return (
      parts
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? '')
        .join('') || '?'
    )
  }, [user.name, user.email])

  return (
    <div className="devos-shell flex min-h-dvh bg-background text-foreground">
      {/* Sidebar desktop (lg+) — générée depuis le registre */}
      <aside className="devos-sidebar sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-4 overflow-y-auto border-r bg-card px-3 py-4 lg:flex">
        <div className="flex items-center gap-2.5 px-2">
          <span
            className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground"
            aria-hidden="true"
          >
            <Volume2 className="size-4.5" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-tight">DevOS</p>
            <p className="truncate text-[11px] text-muted-foreground">Personal Development OS</p>
          </div>
        </div>
        <SideNav currentView={currentView} role={role} onNavigate={navigate} />
        <PlannedNav onNavigate={navigate} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <header className="devos-header sticky top-0 z-40 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
          <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <div className="flex min-w-0 items-center gap-2">
              {/* Tiroir mobile */}
              <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-10 shrink-0 lg:hidden"
                    aria-label="Ouvrir la navigation"
                  >
                    <Menu className="size-5" aria-hidden="true" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-72 overflow-y-auto p-0">
                  <SheetHeader className="border-b px-4 py-3">
                    <SheetTitle className="flex items-center gap-2.5 text-left">
                      <span
                        className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground"
                        aria-hidden="true"
                      >
                        <Volume2 className="size-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold leading-tight">DevOS</span>
                        <span className="block text-[11px] font-normal text-muted-foreground">
                          Personal Development OS
                        </span>
                      </span>
                    </SheetTitle>
                  </SheetHeader>
                  <div className="flex h-[calc(100dvh-8rem)] flex-col overflow-y-auto px-3 py-3">
                    <SideNav currentView={currentView} role={role} onNavigate={navigate} />
                    <PlannedNav onNavigate={navigate} />
                  </div>
                </SheetContent>
              </Sheet>
              <div className="min-w-0">
                <h1 className="truncate text-base font-semibold leading-tight sm:text-lg">{title}</h1>
                <p className="hidden truncate text-xs text-muted-foreground sm:block">{description}</p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {statusConfig ? (
                <Badge
                  variant="outline"
                  className={cn('hidden gap-1.5 px-2.5 py-1 text-xs font-medium md:inline-flex', statusConfig.className)}
                  aria-label={`État de l'assistant : ${statusConfig.label}`}
                >
                  <span className={cn('size-2 rounded-full', statusConfig.dot)} aria-hidden="true" />
                  {statusConfig.label}
                </Badge>
              ) : null}
              <span className="hidden font-mono text-xs text-muted-foreground sm:inline">{clock}</span>
              <div
                className="flex items-center gap-1.5 rounded-full border bg-card py-1 pl-1"
                title={user.email}
              >
                <span
                  className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary"
                  aria-hidden="true"
                >
                  {initials}
                </span>
                <span className="hidden max-w-40 truncate text-sm sm:inline">
                  {user.name ?? user.email}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 rounded-full text-muted-foreground hover:text-foreground"
                  onClick={onLogout}
                  aria-label="Se déconnecter"
                >
                  <LogOut className="size-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Contenu — pleine largeur (w-full, décision CTO TASK-020 ; l'ancien
            conteneur mx-auto max-w-5xl et la clearance pb-24 de la barre
            inférieure mobile sont retirés) */}
        <main className="w-full flex-1 px-4 pb-8 pt-4 sm:px-6 sm:pt-6">
          {children}
        </main>

        {/* Footer sticky (règle UI : mt-auto sur un wrapper flex-col) */}
        <footer className="devos-footer mt-auto border-t bg-card/80 pb-[env(safe-area-inset-bottom)]">
          <div className="flex w-full flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3 text-xs text-muted-foreground sm:px-6 sm:text-sm">
            <span>© {new Date().getFullYear()} DevOS</span>
            <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span>Serveur : {serverOk ? 'connecté' : 'erreur de synchronisation'}</span>
              <span aria-hidden="true">·</span>
              <span>Dernière synchro : {lastTickLabel ?? '—'}</span>
              {quietWindow ? (
                <>
                  <span aria-hidden="true">·</span>
                  <span>Heures silencieuses : {quietWindow}</span>
                </>
              ) : null}
            </span>
          </div>
        </footer>

      </div>
      <FloatingAssistant />
    </div>
  )
}
