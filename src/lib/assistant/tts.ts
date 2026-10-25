/**
 * Moteur de synthèse vocale client (Web Speech API, voix 100 % locales — zéro requête réseau).
 * - File d'attente séquentielle : chaque énoncé est prononcé après le précédent (utterance.onend).
 * - Si l'API est absente : `speak()` renvoie false → l'appelant affiche un toast et se replie
 *   sur les notifications seulement (jamais de crash).
 */

export interface SpeakOptions {
  /** nom de voix préféré (VoicePreferences.voice) */
  voiceName?: string | null
  /** langue BCP-47 ex. "fr-FR" */
  lang?: string
  /** 0..1 */
  volume?: number
}

export function isSpeechSynthesisSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

/** File d'attente module-scope (une seule instance de speechSynthesis par page). */
type QueueItem = { text: string; options: SpeakOptions }
const queue: QueueItem[] = []
let processing = false

function resolveVoice(voiceName?: string | null, lang?: string): SpeechSynthesisVoice | null {
  if (!isSpeechSynthesisSupported()) return null
  const voices = window.speechSynthesis.getVoices()
  if (voices.length === 0) return null
  if (voiceName) {
    const exact = voices.find((v) => v.name === voiceName)
    if (exact) return exact
  }
  if (lang) {
    const normalized = lang.replace('_', '-')
    const byLang =
      voices.find((v) => v.lang === normalized) ??
      voices.find((v) => v.lang.replace('_', '-').startsWith(normalized.split('-')[0]))
    if (byLang) return byLang
  }
  return null
}

function processQueue(): void {
  if (!isSpeechSynthesisSupported()) {
    queue.length = 0
    processing = false
    return
  }
  const item = queue[0]
  if (!item) {
    processing = false
    return
  }
  processing = true

  const utterance = new SpeechSynthesisUtterance(item.text)
  const voice = resolveVoice(item.options.voiceName, item.options.lang)
  if (voice) utterance.voice = voice
  utterance.lang = voice?.lang ?? item.options.lang ?? 'fr-FR'
  utterance.volume = Math.min(1, Math.max(0, item.options.volume ?? 1))
  utterance.onend = () => {
    queue.shift()
    processQueue()
  }
  utterance.onerror = () => {
    queue.shift()
    processQueue()
  }

  try {
    window.speechSynthesis.speak(utterance)
  } catch {
    queue.shift()
    processQueue()
  }
}

/**
 * Met en file un texte à prononcer.
 * @returns true si la synthèse est disponible et l'énoncé mis en file, false sinon.
 */
export function speak(text: string, options: SpeakOptions = {}): boolean {
  if (!isSpeechSynthesisSupported()) return false
  const trimmed = text.trim()
  if (trimmed.length === 0) return true
  queue.push({ text: trimmed, options })
  if (!processing) processQueue()
  return true
}

/** Vide la file et interrompt la lecture en cours (appelé sur unload). */
export function cancelSpeech(): void {
  queue.length = 0
  processing = false
  if (isSpeechSynthesisSupported()) {
    try {
      window.speechSynthesis.cancel()
    } catch {
      // ignoré volontairement
    }
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', cancelSpeech)
}
