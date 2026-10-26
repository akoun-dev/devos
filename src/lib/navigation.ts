/**
 * navigation.ts — registre central de navigation du shell DevOS (ADR-004).
 *
 * Chaque destination est déclarée UNE fois ici ; la sidebar desktop et le
 * tiroir mobile (Sheet) sont générés depuis ce registre. (L'ancienne barre
 * inférieure mobile a été retirée — décision CTO TASK-020, amendement ADR-004 §4.)
 * Statut `planned` = destination affichée, désactivée, badge « Bientôt »
 * (jamais de lien mort, jamais de menu caché discrètement — ADR-004 §5).
 */

import {
  Bell,
  Bot,
  CalendarDays,
  Database,
  FolderKanban,
  GitBranch,
  Github,
  LayoutDashboard,
  ListChecks,
  Mic,
  RefreshCw,
  ScrollText,
  Settings,
  SquareTerminal,
  Workflow,
  type LucideIcon,
} from 'lucide-react'

import { canAccessView } from '@/lib/permissions'
import type { ViewId } from '@/types/workspace'

export type NavSectionId = 'workspace' | 'ai' | 'dev' | 'system'
export type NavStatus = 'active' | 'planned'

export interface NavItem {
  id: ViewId
  label: string
  description: string
  icon: LucideIcon
  status: NavStatus
}

export interface NavSection {
  id: NavSectionId
  label: string
  items: NavItem[]
}

export const NAV_SECTIONS: NavSection[] = [
  {
    id: 'workspace',
    label: 'Espace de travail',
    items: [
      {
        id: 'dashboard',
        label: 'Tableau de bord',
        description: 'Vue générale, priorités, activité récente',
        icon: LayoutDashboard,
        status: 'active',
      },
      {
        id: 'projects',
        label: 'Projets',
        description: 'Créer, suivre, archiver vos projets',
        icon: FolderKanban,
        status: 'active',
      },
      {
        id: 'tasks',
        label: 'Tâches',
        description: 'Ma journée, en retard, prioritaires…',
        icon: ListChecks,
        status: 'active',
      },
      {
        id: 'planning',
        label: 'Planning',
        description: 'Calendrier des échéances',
        icon: CalendarDays,
        status: 'active',
      },
      {
        id: 'notes',
        label: 'Documents & Notes',
        description: 'Rédiger, rechercher, associer à un projet',
        icon: ScrollText,
        status: 'active',
      },
    ],
  },
  {
    id: 'ai',
    label: 'Intelligence artificielle',
    items: [
      {
        id: 'ai-chat',
        label: 'Assistant IA',
        description: 'Conversations, analyses, résumés',
        icon: Bot,
        status: 'active',
      },
      {
        id: 'voice',
        label: 'Assistant vocal',
        description: 'Mode JARVIS : annonces et rappels parlés',
        icon: Mic,
        status: 'active',
      },
      {
        id: 'automations',
        label: 'Automatisations',
        description: 'Scénarios déclenchés selon conditions et horaires',
        icon: Workflow,
        status: 'planned',
      },
    ],
  },
  {
    id: 'dev',
    label: 'Développement',
    items: [
      {
        id: 'git',
        label: 'Dépôts & Git',
        description: 'Dépôts locaux, branches, commits, modifications',
        icon: GitBranch,
        status: 'planned',
      },
      {
        id: 'github',
        label: 'GitHub',
        description: 'Issues, pull requests, CI/CD',
        icon: Github,
        status: 'planned',
      },
      {
        id: 'terminal',
        label: 'Terminal & Outils',
        description: 'Outils autorisés avec confirmations',
        icon: SquareTerminal,
        status: 'planned',
      },
      {
        id: 'activity',
        label: "Journal d'activité",
        description: 'Actions IA, historique technique, erreurs',
        icon: ScrollText,
        status: 'active',
      },
    ],
  },
  {
    id: 'system',
    label: 'Système',
    items: [
      {
        id: 'notifications',
        label: 'Notifications',
        description: 'Rappels et préférences',
        icon: Bell,
        status: 'active',
      },
      {
        id: 'sync',
        label: 'Synchronisation',
        description: 'État, en attente, historique',
        icon: RefreshCw,
        status: 'active',
      },
      {
        id: 'storage',
        label: 'Stockage & Sauvegardes',
        description: 'Espace utilisé, restaurations',
        icon: Database,
        status: 'planned',
      },
      {
        id: 'settings',
        label: 'Paramètres',
        description: 'Voix, IA, rappels, confidentialité',
        icon: Settings,
        status: 'active',
      },
    ],
  },
]

/** Vue par défaut après connexion. */
export const DEFAULT_VIEW: ViewId = 'dashboard'

/** Toutes les destinations à plat (recherche rapide). */
export const ALL_NAV_ITEMS: NavItem[] = NAV_SECTIONS.flatMap((section) => section.items)

export function findNavItem(viewId: ViewId): NavItem | undefined {
  return ALL_NAV_ITEMS.find((item) => item.id === viewId)
}

/** Destinations autorisées pour un rôle (statut actif + matrice permissions). */
export function accessibleSections(role: Parameters<typeof canAccessView>[1]): NavSection[] {
  return NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => canAccessView(item.id, role, item.status === 'active')),
  })).filter((section) => section.items.length > 0)
}
