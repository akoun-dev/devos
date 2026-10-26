'use client'

/**
 * VoiceView — Assistant vocal (mode JARVIS, cahier des charges §3.3) :
 * enveloppe de l'AssistantPanel existant (FEATURE-001) : état d'écoute,
 * test de voix, journal des annonces, snooze. Le mode bouton reste le
 * mécanisme d'interaction ; le mode mains libres est en backlog.
 */

import { AudioLines, Headphones, ShieldCheck } from 'lucide-react'

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
    <div className="flex flex-col gap-5">
      <section className="relative overflow-hidden rounded-2xl border border-indigo-400/20 bg-gradient-to-br from-indigo-500/15 via-blue-500/10 to-[#0b2038] p-5 sm:p-7">
        <div className="pointer-events-none absolute -right-12 -top-14 size-48 rounded-full bg-indigo-500/15 blur-3xl" />
        <div className="relative flex items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-indigo-400/25 bg-indigo-500/15 text-indigo-200 shadow-lg shadow-indigo-950/30">
            <AudioLines className="size-6" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-200">DEVOS VOICE SYSTEM</p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-50 sm:text-2xl">Assistant vocal</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">Un assistant vocal qui vous accompagne dans le suivi des tâches, les rappels et les échéances, avec des commandes simples et un contrôle permanent des annonces.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-400/20 bg-indigo-400/10 px-3 py-1 text-xs text-indigo-100"><Headphones className="size-3.5" /> Commandes vocales</span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-400/20 bg-blue-400/10 px-3 py-1 text-xs text-blue-100"><AudioLines className="size-3.5" /> Test de voix</span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-100"><ShieldCheck className="size-3.5" /> Contrôle des annonces</span>
            </div>
          </div>
        </div>
      </section>
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
      <p className="rounded-xl border border-slate-700/70 bg-[#0b2038]/70 px-4 py-3 text-xs leading-relaxed text-slate-400">
        Mode bouton actif — le mode mains libres (écoute continue) arrive dans une itération
        ultérieure (priorité 12 du MVP).
      </p>
    </div>
  )
}
