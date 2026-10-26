'use client'

/**
 * VoiceView — Assistant vocal (mode JARVIS, cahier des charges §3.3) :
 * enveloppe de l'AssistantPanel existant (FEATURE-001) : état d'écoute,
 * test de voix, journal des annonces, snooze. Le mode bouton reste le
 * mécanisme d'interaction ; le mode mains libres est en backlog.
 */

import { AssistantPanel } from '@/components/assistant/assistant-panel'
import type { JournalEntry, ServerTickInfo } from '@/hooks/use-voice-assistant'
import type { VoicePreferences } from '@/types/assistant'

interface VoiceViewProps {
  prefs: VoicePreferences | null
  prefsLoading: boolean
  announcements: JournalEntry[]
  quietHours: ServerTickInfo['quietHours']
  onSnooze: (logId: string, minutes: number) => void
  onSpeakTest: () => void
  onToggleSuspended: () => void
  onViewTask: (taskId: string) => void
}

export function VoiceView({
  prefs,
  prefsLoading,
  announcements,
  quietHours,
  onSnooze,
  onSpeakTest,
  onToggleSuspended,
  onViewTask,
}: VoiceViewProps) {
  return (
    <div className="flex flex-col gap-4">
      <AssistantPanel
        prefs={prefs}
        prefsLoading={prefsLoading}
        announcements={announcements}
        quietHours={quietHours}
        onSnooze={onSnooze}
        onSpeakTest={onSpeakTest}
        onToggleSuspended={onToggleSuspended}
        onViewTask={onViewTask}
      />
      <p className="text-xs text-muted-foreground">
        Mode bouton actif — le mode mains libres (écoute continue) arrive dans une itération
        ultérieure (priorité 12 du MVP).
      </p>
    </div>
  )
}
