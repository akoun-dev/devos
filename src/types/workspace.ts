/**
 * Types DevOS — FEATURE-UI-SHELL « Espace de travail »
 * Source de vérité : .ai/API_CONTRACTS.md (contrat v1.3, AUTHORITATIF).
 * Dates en ISO 8601 (UTC), fuseau serveur = Africa/Abidjan (UTC+0).
 */

import type { TaskPriority } from '@/types/assistant'

// ─── Navigation & permissions ───

/** Identifiants de vues du shell (registre : src/lib/navigation.ts). */
export type ViewId =
  | 'dashboard'
  | 'projects'
  | 'tasks'
  | 'planning'
  | 'notes'
  | 'ai-chat'
  | 'voice'
  | 'automations'
  | 'git'
  | 'github'
  | 'terminal'
  | 'activity'
  | 'notifications'
  | 'sync'
  | 'storage'
  | 'settings'

/** Rôles DevOS (matrice : .ai/ROLES_PERMISSIONS.md). v1 : proprietaire uniquement. */
export type Role = 'proprietaire' | 'administrateur' | 'developpeur' | 'collaborateur' | 'lecteur' | 'assistant_ia'

// ─── Projets ───

export type ProjectStatus = 'actif' | 'en_pause' | 'termine' | 'archive'

/** Projet DevOS */
export interface Project {
  id: string
  name: string
  description: string | null
  status: ProjectStatus
  priority: TaskPriority
  favorite: boolean
  color: string | null
  dueAt: string | null
  createdAt: string
  updatedAt: string
  /** Compteurs agrégés (renvoyés par l'API). */
  taskCount: number
  doneTaskCount: number
}

// ─── Documents & Notes ───

/** Note / document DevOS */
export interface Note {
  id: string
  title: string
  content: string
  favorite: boolean
  trashed: boolean
  projectId: string | null
  projectName: string | null
  createdAt: string
  updatedAt: string
}

// ─── Journal d'activité (serveur) ───

export type ActivityFilter = 'all' | 'ia' | 'errors'

/** Entrée du journal d'activité (ReminderLog sérialisé + titre de tâche). */
export interface ActivityEntry {
  id: string
  taskId: string | null
  taskTitle: string | null
  type: string
  scheduledFor: string
  status: string
  firedAt: string | null
  snoozedUntil: string | null
  message: string | null
  messageSource: string | null
  createdAt: string
}

// ─── Assistant IA (chat) ───

export type ChatRole = 'user' | 'assistant'

export interface ChatMessage {
  role: ChatRole
  content: string
  /** horodatage local (ISO) côté client */
  at: string
}

export interface AiChatResponse {
  message: ChatMessage
  remaining: number | null
  /** Conversation persistée (contrat v1.4). */
  conversationId: string
}

/** Résumé de conversation IA (contrat v1.4). */
export interface AiConversationSummary {
  id: string
  title: string
  context: string
  messageCount: number
  createdAt: string
  updatedAt: string
}

// ─── Automatisations (contrat v1.4) ───

export type AutomationTriggerType = 'schedule' | 'condition'
export type AutomationRunTrigger = 'schedule' | 'condition' | 'manuel'

/** Automatisation DevOS. */
export interface Automation {
  id: string
  name: string
  enabled: boolean
  triggerType: AutomationTriggerType
  scheduleTime: string | null
  scheduleDays: string
  conditionType: 'overdue_count' | null
  threshold: number | null
  message: string | null
  lastRunAt: string | null
  createdAt: string
  updatedAt: string
}

/** Exécution d'une automatisation. */
export interface AutomationRun {
  id: string
  trigger: AutomationRunTrigger
  scheduledFor: string
  status: string
  firedAt: string | null
  message: string | null
  messageSource: string | null
  createdAt: string
}

// ─── Système ───

/** État système affiché par la vue Synchronisation. */
export interface SystemStatus {
  serverOk: boolean
  version: string
  now: string
  db: string
}
