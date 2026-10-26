'use client'

/**
 * useSpeechDictation — dictée vocale (Web Speech API, reconnaissance navigateur).
 *
 * Conçu pour le composer de la vue « DevOS Intelligence » (TASK-024) : appui sur
 * le micro → écoute fr-FR → transcript final transmis à onTranscript (le texte
 * est inséré dans le champ pour relecture AVANT envoi — contrairement à
 * l'assistant flottant qui envoie directement).
 *
 * Dégradation gracieuse : si l'API n'est pas supportée (Firefox, headless…),
 * onError est appelé au clic — le bouton reste actif (aucun état désactivé au
 * rendu pour éviter tout mismatch d'hydratation SSR).
 */

import { useCallback, useEffect, useRef, useState } from 'react'

type SpeechResult = { results: ArrayLike<ArrayLike<{ transcript: string }>> }

type SpeechInstance = {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((event: SpeechResult) => void) | null
  onerror: ((event: { error?: string }) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}

type SpeechConstructor = new () => SpeechInstance

type SpeechWindow = Window & {
  SpeechRecognition?: SpeechConstructor
  webkitSpeechRecognition?: SpeechConstructor
}

export interface UseSpeechDictationOptions {
  /** BCP 47 de la reconnaissance (défaut fr-FR — produit FR-003). */
  lang?: string
  /** Appelé avec le transcript final (non vide, trimmé). */
  onTranscript: (text: string) => void
  /** Appelé si l'API est absente ou l'écoute échoue (message FR orienté utilisateur). */
  onError?: (message: string) => void
}

export function useSpeechDictation({ lang = 'fr-FR', onTranscript, onError }: UseSpeechDictationOptions) {
  const [listening, setListening] = useState(false)
  const recognitionRef = useRef<SpeechInstance | null>(null)
  const onTranscriptRef = useRef(onTranscript)
  const onErrorRef = useRef(onError)

  useEffect(() => {
    onTranscriptRef.current = onTranscript
  }, [onTranscript])

  useEffect(() => {
    onErrorRef.current = onError
  }, [onError])

  const stop = useCallback(() => {
    recognitionRef.current?.stop()
    recognitionRef.current = null
    setListening(false)
  }, [])

  const start = useCallback(() => {
    const speechWindow = window as SpeechWindow
    const Recognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition
    if (!Recognition) {
      onErrorRef.current?.(
        "La dictée vocale n'est pas prise en charge par ce navigateur. Vous pouvez écrire votre demande.",
      )
      return
    }
    const recognition = new Recognition()
    recognition.lang = lang
    recognition.continuous = false
    recognition.interimResults = false
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript ?? '')
        .join(' ')
        .trim()
      if (transcript) onTranscriptRef.current(transcript)
    }
    recognition.onerror = () => {
      onErrorRef.current?.("Écoute interrompue. Vérifiez l'autorisation du microphone puis réessayez.")
      setListening(false)
      recognitionRef.current = null
    }
    recognition.onend = () => {
      setListening(false)
      recognitionRef.current = null
    }
    recognitionRef.current = recognition
    try {
      recognition.start()
      setListening(true)
    } catch {
      onErrorRef.current?.('Impossible de démarrer le microphone. Réessayez.')
      setListening(false)
      recognitionRef.current = null
    }
  }, [lang])

  const toggle = useCallback(() => {
    if (listening) stop()
    else start()
  }, [listening, start, stop])

  // Nettoyage au démontage : stoppe proprement le micro.
  useEffect(
    () => () => {
      recognitionRef.current?.stop()
      recognitionRef.current = null
    },
    [],
  )

  return { listening, start, stop, toggle }
}
