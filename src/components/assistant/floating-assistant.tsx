'use client'

import { useEffect, useRef, useState } from 'react'
import { Bot, Mic, MicOff, Send, Volume2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { apiFetch } from '@/lib/assistant/api'
import { speak, cancelSpeech } from '@/lib/assistant/tts'
import { cn } from '@/lib/utils'

type Message = { role: 'user' | 'assistant'; content: string }
type RecognitionResult = { results: ArrayLike<ArrayLike<{ transcript: string }>> }
type RecognitionInstance = {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((event: RecognitionResult) => void) | null
  onerror: (() => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}
type RecognitionConstructor = new () => RecognitionInstance
type SpeechWindow = Window & {
  SpeechRecognition?: RecognitionConstructor
  webkitSpeechRecognition?: RecognitionConstructor
}

export function FloatingAssistant() {
  const [open, setOpen] = useState(false)
  const [listening, setListening] = useState(false)
  const [busy, setBusy] = useState(false)
  const [input, setInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Bonjour ! Je suis votre assistant DevOS. Écrivez-moi ou appuyez sur le microphone pour parler.' },
  ])
  const recognitionRef = useRef<RecognitionInstance | null>(null)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, busy])

  useEffect(() => () => {
    recognitionRef.current?.stop()
    cancelSpeech()
  }, [])

  const stopListening = () => {
    recognitionRef.current?.stop()
    recognitionRef.current = null
    setListening(false)
  }

  const startListening = () => {
    setError(null)
    const speechWindow = window as SpeechWindow
    const Recognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition
    if (!Recognition) {
      setError('La reconnaissance vocale n’est pas prise en charge par ce navigateur. Vous pouvez toujours écrire votre demande.')
      return
    }
    const recognition = new Recognition()
    recognition.lang = 'fr-FR'
    recognition.continuous = false
    recognition.interimResults = false
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results).map((result) => result[0]?.transcript ?? '').join(' ').trim()
      if (transcript) {
        setInput(transcript)
        void sendMessage(transcript)
      }
    }
    recognition.onerror = () => {
      setError('Écoute interrompue. Vérifiez l’autorisation du microphone puis réessayez.')
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
      setError('Impossible de démarrer le microphone. Réessayez.')
      setListening(false)
      recognitionRef.current = null
    }
  }

  const sendMessage = async (raw: string) => {
    const content = raw.trim()
    if (!content || busy) return
    stopListening()
    setError(null)
    const next = [...messages, { role: 'user' as const, content }]
    setMessages(next)
    setInput('')
    setBusy(true)
    try {
      const data = await apiFetch<{ message: { content: string } }>('/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({
          messages: next.filter((message) => message.role === 'user' || message.role === 'assistant').slice(-20),
          context: 'general',
        }),
      })
      const answer = data.message.content
      setMessages((current) => [...current, { role: 'assistant', content: answer }])
      speak(answer, { lang: 'fr-FR' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'L’assistant est momentanément indisponible.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Ouvrir l’assistant DevOS"
        className="fixed bottom-5 right-5 z-40 size-14 rounded-full border border-blue-300/30 bg-gradient-to-br from-blue-600 to-indigo-600 p-0 text-white shadow-xl shadow-blue-950/40 transition hover:scale-105 hover:from-blue-500 hover:to-indigo-500"
      >
        <span className="relative flex size-full items-center justify-center">
          <Bot className="size-6" />
          <span className="absolute -right-0.5 -top-0.5 size-3 rounded-full border-2 border-background bg-emerald-400" />
        </span>
      </Button>

      {open ? (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/70 p-0 backdrop-blur-sm sm:items-center sm:p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) { stopListening(); setOpen(false) } }}>
          <section role="dialog" aria-modal="true" aria-labelledby="devos-floating-title" className="flex h-[min(760px,92dvh)] w-full max-w-xl flex-col overflow-hidden rounded-t-2xl border border-blue-400/25 bg-[#09172b] text-slate-100 shadow-2xl shadow-black/50 sm:h-[min(760px,88dvh)] sm:rounded-2xl">
            <header className="flex items-center gap-3 border-b border-slate-700/80 bg-gradient-to-r from-blue-600/20 via-indigo-600/15 to-transparent p-4">
              <div className="flex size-11 items-center justify-center rounded-xl border border-blue-300/25 bg-blue-500/15 text-blue-200"><Bot className="size-6" /></div>
              <div className="min-w-0 flex-1">
                <h2 id="devos-floating-title" className="font-semibold">Assistant DevOS</h2>
                <p className="text-xs text-slate-400">Texte et voix dans une seule conversation</p>
              </div>
              <Button variant="ghost" size="icon" className="text-slate-300 hover:bg-white/10 hover:text-white" onClick={() => { stopListening(); setOpen(false) }} aria-label="Fermer l’assistant"><X className="size-5" /></Button>
            </header>

            <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden">
              <div className={cn('pointer-events-none absolute top-5 size-40 rounded-full bg-blue-500/10 blur-3xl transition-all', listening && 'size-64 bg-cyan-400/20')} />
              <div className="z-10 flex w-full flex-1 flex-col gap-3 overflow-y-auto p-4">
                {messages.map((message, index) => (
                  <div key={index} className={cn('max-w-[88%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed', message.role === 'user' ? 'ml-auto rounded-br-md bg-blue-600 text-white' : 'mr-auto rounded-bl-md border border-slate-700 bg-[#112640] text-slate-100')}>
                    {message.content}
                  </div>
                ))}
                {busy ? <p className="mr-auto animate-pulse rounded-xl border border-slate-700 bg-[#112640] px-3 py-2 text-sm text-slate-400">DevOS réfléchit…</p> : null}
                {error ? <p role="alert" className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 text-xs text-amber-200">{error}</p> : null}
                <div ref={endRef} />
              </div>
              <div className="flex w-full flex-col items-center gap-3 border-t border-slate-700/80 bg-[#0b1d33] p-4">
                <div className="flex min-h-24 flex-col items-center justify-center gap-2">
                  <button type="button" onClick={listening ? stopListening : startListening} aria-pressed={listening} aria-label={listening ? 'Arrêter l’écoute' : 'Démarrer l’écoute'} className={cn('relative flex size-16 items-center justify-center rounded-full border transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300', listening ? 'border-cyan-200 bg-cyan-400 text-slate-950 shadow-[0_0_0_12px_rgba(34,211,238,0.10),0_0_45px_rgba(34,211,238,0.45)]' : 'border-blue-300/30 bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-950/50 hover:scale-105')}>
                    {listening ? <span className="absolute inset-[-8px] animate-ping rounded-full border border-cyan-300/40" /> : null}
                    {listening ? <MicOff className="z-10 size-6" /> : <Mic className="z-10 size-6" />}
                  </button>
                  <p className={cn('text-xs', listening ? 'animate-pulse text-cyan-200' : 'text-slate-400')}>{listening ? 'Je vous écoute… parlez maintenant' : 'Appuyez pour parler'}</p>
                </div>
                <form className="flex w-full items-end gap-2" onSubmit={(event) => { event.preventDefault(); void sendMessage(input) }}>
                  <textarea value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void sendMessage(input) } }} rows={1} maxLength={4000} placeholder="Écrivez votre demande…" aria-label="Message à l’assistant" disabled={busy} className="max-h-28 min-h-11 flex-1 resize-y rounded-xl border border-slate-700 bg-[#10243c] px-3 py-2.5 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30" />
                  <Button type="submit" disabled={busy || !input.trim()} aria-label="Envoyer le message" className="size-11 shrink-0 bg-blue-600 text-white hover:bg-blue-500"><Send className="size-4" /></Button>
                </form>
                <div className="flex w-full items-center justify-between text-[11px] text-slate-500"><span><Volume2 className="mr-1 inline size-3.5" /> Réponses vocales activées</span><span>Micro autorisé par le navigateur</span></div>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </>
  )
}
