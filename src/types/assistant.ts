/**
 * Types DevOS — FEATURE-001 « Assistant vocal proactif »
 * Source de vérité : .ai/API_CONTRACTS.md (contrat v1, AUTHORITATIF).
 * Dates en ISO 8601 (UTC), fuseau serveur = Africa/Abidjan (UTC+0).
 */

export type TaskPriority = 'basse' | 'normale' | 'haute' | 'urgente'
export type TaskStatus = 'en_cours' | 'terminee' | 'annulee'
export type AnnouncementType = 'reminder' | 'new_task' | 'deadline' | 'priority' | 'automation'
export type MessageSource = 'ia' | 'template'
export type VoiceStyle = 'naturel' | 'professionnel' | 'bref'

/** Tâche DevOS */
export interface Task {
  id: string
  title: string
  description: string | null
  category: string
  priority: TaskPriority
  status: TaskStatus
  dueAt: string | null
  /** null => utilise le délai global des préférences */
  reminderOffsetMinutes: number | null
  reminderEnabled: boolean
  /** projet rattaché (FEATURE-UI-SHELL, contrat v1.3) */
  projectId: string | null
  projectName: string | null
  createdAt: string
  updatedAt: string
}

/** Utilisateur authentifié (contrat /api/auth/* — FEATURE-AUTH). */
export interface AuthUser {
  id: string
  email: string
  name: string | null
}

/** Préférences vocales (par utilisateur — le singleton "default" a disparu avec FEATURE-AUTH) */
export interface VoicePreferences {
  enabled: boolean
  reminderOffsetMinutes: number
  announceNewTasks: boolean
  announceDeadlines: boolean
  announcePriorities: boolean
  quietHoursEnabled: boolean
  quietStart: string
  quietEnd: string
  /** CSV 0..6 (0=dimanche), défaut tous les jours */
  quietDays: string
  style: VoiceStyle
  language: string
  /** nom de voix navigateur (speechSynthesis), null = automatique */
  voice: string | null
  /** 0..1 */
  volume: number
  /** CSV de catégories, "" = toutes autorisées */
  allowedCategories: string
  privacyMode: boolean
  urgentOverrideQuiet: boolean
  suspended: boolean
  suspendedUntil: string | null
  updatedAt: string
}

/** Annonce produite par le tick serveur — PRÊTE À PRONONCER */
export interface Announcement {
  /** ReminderLog id = clé anti-doublon client */
  id: string
  type: AnnouncementType
  taskId: string | null
  title: string
  /** template ou reformulation IA — style + privacy déjà appliqués côté serveur */
  message: string
  messageSource: MessageSource
  priority: string
  dueAt: string | null
  /** priority = urgente */
  urgent: boolean
  /** false => supprimée (heures silencieuses/suspension) : notification muette uniquement, JAMAIS rejouée */
  spoken: boolean
}

/** Réponse de POST /api/assistant/tick */
export interface TickResponse {
  announcements: Announcement[]
  now: string
  quietHours: {
    active: boolean
    window: string | null
  }
}

/** Réponse de POST /api/assistant/test-voice */
export interface TestVoiceResponse {
  message: string
  messageSource: MessageSource
}
