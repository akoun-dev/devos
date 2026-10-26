'use client'

/**
 * SettingsView — Paramètres (cahier des charges §3.5) : enveloppe du
 * SettingsScreen existant (voix, IA, rappels, heures silencieuses,
 * confidentialité) + plan des sections système à venir.
 */

import { SettingsScreen } from '@/components/assistant/settings-screen'
import type { VoicePreferences } from '@/types/assistant'

interface SettingsViewProps {
  prefs: VoicePreferences | null
  prefsLoading: boolean
  categories: string[]
  onSave: (partial: Partial<VoicePreferences>) => void
  onSpeakTest: () => void
  onToggleSuspended: () => void
}

const UPCOMING_SECTIONS = [
  'Général et langue',
  'Apparence et thème',
  'Assistant IA et modèles',
  'Assistant vocal (existant)',
  'Rappels et heures silencieuses (existant)',
  'Confidentialité et permissions (existant)',
  'Stockage local',
  'Synchronisation',
  'Git et GitHub',
  'Appareils connectés',
  'Sauvegardes',
  'Diagnostic et journaux',
  'À propos de DevOS',
]

export function SettingsView({ prefs, prefsLoading, categories, onSave, onSpeakTest, onToggleSuspended }: SettingsViewProps) {
  return (
    <div className="flex flex-col gap-4">
      <SettingsScreen
        prefs={prefs}
        prefsLoading={prefsLoading}
        categories={categories}
        onSave={onSave}
        onSpeakTest={onSpeakTest}
        onToggleSuspended={onToggleSuspended}
      />
      <details className="rounded-lg border bg-card p-4 text-sm">
        <summary className="cursor-pointer font-medium">Sections système prévues (cahier des charges §3.5)</summary>
        <ul className="mt-2 list-inside list-disc space-y-1 text-muted-foreground">
          {UPCOMING_SECTIONS.map((section) => (
            <li key={section}>{section}</li>
          ))}
        </ul>
      </details>
    </div>
  )
}
