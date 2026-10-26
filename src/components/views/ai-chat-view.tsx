'use client'

/**
 * AiChatView — « DevOS Intelligence » (refonte maquette CTO — TASK-024).
 *
 * Structure fidèle à la maquette validée : en-tête logo + badge « Unifie »,
 * carte de bienvenue (état vide), composer (pièce jointe · micro · envoi),
 * chips de capacités. Les fonctionnalités livrées sont conservées integralement
 * (contrat v1.4) : historique persistant (Sheet « Historique partagé »),
 * contextes, suggestions, rate limit (remaining affiché), 401 → déconnexion.
 *
 * Nouveautés TASK-024 : dictée vocale (use-speech-dictation, Web Speech API —
 * transcript inséré dans le champ pour relecture avant envoi), lecture
 * vocale des réponses (bouton volume, lib/assistant/tts), pièces jointes
 * annoncées « bientôt » (aucun faux lien mort — ADR-004 §5).
 * SDK z-ai-web-dev-sdk : BACKEND uniquement (aucun appel direct client).
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ArrowUp,
  BrainCircuit,
  History,
  Loader2,
  MessageSquare,
  Mic,
  Paperclip,
  RotateCcw,
  Trash2,
  Volume2,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { useSpeechDictation } from '@/hooks/use-speech-dictation'
import { ApiError, apiFetch } from '@/lib/assistant/api'
import { formatTimeFR } from '@/lib/assistant/format'
import { speak } from '@/lib/assistant/tts'
import { cn } from '@/lib/utils'
import type { AiChatResponse, AiConversationSummary, ChatMessage } from '@/types/workspace'

type ChatContext = 'general' | 'dev' | 'planification'

const CONTEXT_OPTIONS: { value: ChatContext; label: string; hint: string }[] = [
  { value: 'general', label: 'Général', hint: 'Questions, résumés, rédaction' },
  { value: 'dev', label: 'Développement', hint: 'Code, architecture, débogage' },
  { value: 'planification', label: 'Planification', hint: 'Projets, priorités, échéances' },
]

const SUGGESTIONS: Record<ChatContext, string[]> = {
  general: ['Résume mes objectifs de la semaine', 'Aide-moi à décomposer un projet complexe'],
  dev: ['Explique la différence JWT vs session cookie', 'Relis ce snippet et propose des améliorations'],
  planification: ['Comment prioriser des tâches urgentes et importantes ?', 'Propose un planning de semaine type'],
}

const MAX_MESSAGES = 20
const MAX_LENGTH = 4_000

/** Pilule de capacité (chips du bas — maquette TASK-024). */
const CHIP_CLASS =
  'rounded-full border border-slate-700 bg-slate-800/60 px-3 py-1.5 text-xs text-slate-300'

interface AiChatViewProps {
  onUnauthorized: () => void
}

export function AiChatView({ onUnauthorized }: AiChatViewProps) {
  const { toast } = useToast()
  const [context, setContext] = useState<ChatContext>('general')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [remaining, setRemaining] = useState<number | null>(null)
  const [conversations, setConversations] = useState<AiConversationSummary[]>([])
  const [conversationsLoading, setConversationsLoading] = useState(true)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [conversationTitle, setConversationTitle] = useState<string | null>(null)
  const [openingConversation, setOpeningConversation] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, sending])

  const refreshConversations = useCallback(async () => {
    try {
      const data = await apiFetch<{ conversations: AiConversationSummary[] }>('/api/ai/conversations?limit=30')
      setConversations(data.conversations)
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) onUnauthorized()
    } finally {
      setConversationsLoading(false)
    }
  }, [onUnauthorized])

  useEffect(() => {
    void refreshConversations()
  }, [refreshConversations])

  const resetConversation = useCallback(() => {
    setConversationId(null)
    setConversationTitle(null)
    setMessages([])
  }, [])

  const openConversation = useCallback(
    async (id: string) => {
      if (openingConversation || id === conversationId) return
      setOpeningConversation(true)
      try {
        const data = await apiFetch<{
          conversation: AiConversationSummary
          messages: { id: string; role: 'user' | 'assistant'; content: string; createdAt: string }[]
        }>(`/api/ai/conversations/${id}`)
        setConversationId(data.conversation.id)
        setConversationTitle(data.conversation.title)
        setContext((data.conversation.context as ChatContext) ?? 'general')
        setMessages(data.messages.map((message) => ({ role: message.role, content: message.content, at: message.createdAt })))
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) onUnauthorized()
        toast({
          title: 'Conversation indisponible',
          description: error instanceof Error ? error.message : undefined,
          variant: 'destructive',
        })
      } finally {
        setOpeningConversation(false)
      }
    },
    [conversationId, openingConversation, onUnauthorized, toast],
  )

  const deleteConversation = useCallback(
    async (id: string) => {
      try {
        await apiFetch<{ ok: boolean }>(`/api/ai/conversations/${id}`, { method: 'DELETE' })
        if (id === conversationId) resetConversation()
        await refreshConversations()
        toast({ title: 'Conversation supprimée' })
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) onUnauthorized()
        toast({
          title: 'Suppression impossible',
          description: error instanceof Error ? error.message : undefined,
          variant: 'destructive',
        })
      }
    },
    [conversationId, onUnauthorized, refreshConversations, resetConversation, toast],
  )

  const send = useCallback(
    async (text: string) => {
      const content = text.trim()
      if (!content || sending) return
      const userMessage: ChatMessage = { role: 'user', content, at: new Date().toISOString() }
      const history = [...messages, userMessage]
      setMessages(history)
      setInput('')
      setSending(true)
      try {
        const data = await apiFetch<AiChatResponse>('/api/ai/chat', {
          method: 'POST',
          body: JSON.stringify({
            messages: history.slice(-MAX_MESSAGES).map((message) => ({ role: message.role, content: message.content })),
            context,
            ...(conversationId ? { conversationId } : {}),
          }),
        })
        setMessages((prev) => [...prev, data.message])
        setRemaining(data.remaining)
        if (data.conversationId && data.conversationId !== conversationId) {
          setConversationId(data.conversationId)
        }
        await refreshConversations()
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) onUnauthorized()
        toast({
          title: 'Assistant IA indisponible',
          description: error instanceof Error ? error.message : undefined,
          variant: 'destructive',
        })
      } finally {
        setSending(false)
      }
    },
    [messages, sending, context, conversationId, refreshConversations, toast, onUnauthorized],
  )

  // Dictée vocale : le transcript est inséré dans le champ pour relecture
  // avant envoi (l'utilisateur garde le contrôle — règle « contrôle des
  // actions conservé » du cahier des charges).
  const dictation = useSpeechDictation({
    onTranscript: (text) => setInput((prev) => (prev ? `${prev} ${text}` : text)),
    onError: (message) => toast({ title: 'Micro', description: message, variant: 'destructive' }),
  })

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void send(input)
  }

  const handleAttach = () => {
    toast({
      title: 'Pièces jointes',
      description: 'Fonctionnalité en préparation — bientôt disponible.',
    })
  }

  const speakMessage = (content: string) => {
    const spoken = speak(content, { lang: 'fr-FR' })
    if (!spoken) {
      toast({ title: 'Synthèse vocale indisponible sur ce navigateur' })
    }
  }

  const hasActiveConversation = messages.length > 0 || conversationId !== null
  const showWelcome = messages.length === 0 && !sending && !openingConversation

  return (
    <div className="flex flex-col gap-4">
      {/* ─── En-tête (maquette TASK-024) ─── */}
      <section className="rounded-2xl border border-slate-700/80 bg-[#0e2036] p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-950/40">
            <BrainCircuit className="size-6" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold tracking-tight text-slate-50 sm:text-xl">DevOS Intelligence</h2>
            <p className="mt-0.5 text-sm text-slate-400">Assistant IA unifié · Texte et voix</p>
          </div>
          <span className="rounded-full border border-emerald-400/30 bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-300">
            Unifie
          </span>
        </div>
      </section>

      {/* ─── Barre d&apos;outils : contexte, nouvelle conversation, quota ─── */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={context} onValueChange={(value) => setContext(value as ChatContext)}>
          <SelectTrigger className="h-11 w-44 sm:h-9" aria-label="Contexte de la conversation">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CONTEXT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label} — {option.hint}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hasActiveConversation ? (
          <Button
            variant="ghost"
            size="sm"
            className="min-h-11 sm:min-h-9"
            onClick={resetConversation}
            disabled={sending}
          >
            <RotateCcw aria-hidden="true" />
            Nouvelle conversation
          </Button>
        ) : null}
        {remaining !== null ? (
          <span className="ml-auto text-xs text-slate-500" aria-live="polite">
            Requêtes restantes : {remaining}
          </span>
        ) : null}
      </div>

      {/* ─── Bienvenue (état vide) OU conversation courante ─── */}
      {showWelcome ? (
        <section
          className="rounded-2xl border border-slate-700/80 bg-[#0b2038]/90 p-5 sm:p-6"
          aria-label="Message de bienvenue"
        >
          <p className="text-[15px] font-medium leading-relaxed text-slate-100">
            Bonjour ! Je suis votre assistant DevOS. Comment puis-je vous aider ?
          </p>
          <p className="mt-2 text-sm text-slate-400">
            Vous pouvez écrire votre demande ou utiliser le microphone.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {SUGGESTIONS[context].map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => void send(suggestion)}
                className={cn(
                  'min-h-11 rounded-full border border-slate-700 px-3.5 py-2 text-xs text-slate-300 transition-colors',
                  'hover:border-blue-400/40 hover:bg-blue-500/10 hover:text-blue-200 sm:min-h-9',
                )}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </section>
      ) : (
        <section className="flex flex-col overflow-hidden rounded-2xl border border-slate-700/80 bg-[#0b2038]/90">
          {conversationTitle ? (
            <div className="flex items-center justify-between gap-2 border-b border-slate-700/70 px-4 py-2.5 sm:px-5">
              <p className="truncate text-xs text-slate-400" aria-live="polite">
                {openingConversation ? 'Chargement…' : conversationTitle}
              </p>
              <Badge variant="secondary" className="shrink-0 text-[10px]">
                Persistée
              </Badge>
            </div>
          ) : null}
          <div
            ref={listRef}
            className="devos-scroll max-h-96 flex-1 space-y-3 overflow-y-auto p-4 sm:p-5"
            aria-live="polite"
            aria-label="Conversation"
          >
            {messages.length === 0 && openingConversation ? (
              <div className="flex h-24 items-center justify-center gap-2 text-sm text-slate-400">
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Chargement de la conversation…
              </div>
            ) : null}

            {messages.map((message, index) => (
              <div
                key={`${message.at}-${index}`}
                className={cn('flex', message.role === 'user' ? 'justify-end' : 'justify-start')}
              >
                {message.role === 'user' ? (
                  <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-blue-600 px-3.5 py-2.5 text-sm leading-relaxed text-white sm:max-w-[75%]">
                    {message.content}
                    <span className="mt-1 block text-[10px] text-blue-100/80">{formatTimeFR(message.at)}</span>
                  </div>
                ) : (
                  <div className="flex max-w-[85%] items-end gap-1 sm:max-w-[75%]">
                    <div className="whitespace-pre-wrap rounded-2xl rounded-bl-md border border-slate-700 bg-[#12294a] px-3.5 py-2.5 text-sm leading-relaxed text-slate-100">
                      {message.content}
                      <span className="mt-1 block text-[10px] text-slate-500">{formatTimeFR(message.at)}</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-9 shrink-0 text-slate-500 hover:text-blue-300"
                      onClick={() => speakMessage(message.content)}
                      aria-label="Écouter cette réponse"
                    >
                      <Volume2 className="size-4" aria-hidden="true" />
                    </Button>
                  </div>
                )}
              </div>
            ))}

            {sending ? (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl rounded-bl-md border border-slate-700 bg-[#12294a] px-3.5 py-2.5 text-sm text-slate-400">
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  L&apos;assistant rédige…
                </div>
              </div>
            ) : null}
          </div>
        </section>
      )}

      {/* ─── Composer (maquette TASK-024) ─── */}
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-slate-700/80 bg-[#0b2038]/90 p-3 sm:p-4"
      >
        <Textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault()
              void send(input)
            }
          }}
          rows={2}
          maxLength={MAX_LENGTH}
          placeholder="Posez votre question ou donnez une commande..."
          aria-label="Message pour l'assistant DevOS"
          disabled={sending}
          className="max-h-40 min-h-14 resize-none border-0 bg-transparent p-1 text-[15px] shadow-none focus-visible:ring-0 dark:bg-transparent"
        />
        <div className="mt-2 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={handleAttach}
            aria-label="Pièce jointe (bientôt disponible)"
            className="flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm text-slate-400 transition-colors hover:text-slate-200"
          >
            <Paperclip className="size-4" aria-hidden="true" />
            <span className="hidden sm:inline">Pièce jointe</span>
          </button>
          <div className="flex items-center gap-2">
            {input.length > MAX_LENGTH - 500 ? (
              <span className="text-[11px] text-slate-500">{input.length}/{MAX_LENGTH}</span>
            ) : null}
            <Button
              type="button"
              size="icon"
              onClick={dictation.toggle}
              aria-pressed={dictation.listening}
              aria-label={dictation.listening ? "Arrêter l'écoute" : 'Dicter au microphone'}
              className={cn(
                'size-11 rounded-xl transition-colors',
                dictation.listening
                  ? 'animate-pulse bg-blue-500 text-white hover:bg-blue-400'
                  : 'bg-blue-900/60 text-blue-200 hover:bg-blue-800/70',
              )}
            >
              <Mic className="size-5" aria-hidden="true" />
            </Button>
            <Button
              type="submit"
              size="icon"
              disabled={sending || !input.trim()}
              aria-label="Envoyer le message"
              className="size-11 rounded-xl bg-blue-600 text-white hover:bg-blue-500"
            >
              {sending ? <Loader2 className="size-5 animate-spin" aria-hidden="true" /> : <ArrowUp className="size-5" aria-hidden="true" />}
            </Button>
          </div>
        </div>
      </form>

      {/* ─── Chips de capacités (maquette TASK-024) ─── */}
      <div className="flex flex-wrap items-center gap-2" aria-label="Capacités de l'assistant">
        <button
          type="button"
          onClick={() => setHistoryOpen(true)}
          aria-haspopup="dialog"
          className={cn(
            CHIP_CLASS,
            'min-h-11 transition-colors hover:border-slate-600 hover:bg-slate-700/60 hover:text-slate-100 sm:min-h-0',
          )}
        >
          Historique partagé{conversations.length > 0 ? ` · ${conversations.length}` : ''}
        </button>
        <span className={CHIP_CLASS}>Réponses vocales</span>
        <span className={CHIP_CLASS}>Commandes DevOS</span>
      </div>

      {/* ─── Historique persistant (contrat v1.4 — Sheet) ─── */}
      <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
        <SheetContent side="right" className="w-full border-slate-700 bg-[#0b1a2e] p-0 sm:max-w-md">
          <SheetHeader className="border-b border-slate-700/80 p-4">
            <SheetTitle className="flex items-center gap-2 text-base text-slate-100">
              <History className="size-4 text-blue-300" aria-hidden="true" />
              Historique des conversations
            </SheetTitle>
            <SheetDescription>
              Reprenez un échange enregistré ou supprimez-le — vos conversations sont conservées sur votre compte.
            </SheetDescription>
          </SheetHeader>
          <div className="devos-scroll max-h-[calc(100dvh-10rem)] overflow-y-auto p-4">
            {conversationsLoading ? (
              <div className="flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-400">
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Chargement de l&apos;historique…
              </div>
            ) : conversations.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-700 px-3 py-2 text-sm text-slate-400">
                Aucune conversation enregistrée — votre premier échange apparaîtra ici.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {conversations.map((conversation) => {
                  const isCurrent = conversation.id === conversationId
                  return (
                    <li key={conversation.id} className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          void openConversation(conversation.id)
                          setHistoryOpen(false)
                        }}
                        aria-current={isCurrent ? 'true' : undefined}
                        className={cn(
                          'group flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-lg border px-3 py-1.5 text-left text-sm transition-colors',
                          isCurrent
                            ? 'border-blue-400/40 bg-blue-500/10 text-blue-200'
                            : 'border-slate-700/70 text-slate-200 hover:bg-slate-800/60',
                        )}
                      >
                        <MessageSquare className="size-3.5 shrink-0 text-slate-500" aria-hidden="true" />
                        <span className="min-w-0 flex-1 truncate">{conversation.title}</span>
                        <span className="shrink-0 text-[11px] text-slate-500">
                          {conversation.messageCount} msg · {formatTimeFR(conversation.updatedAt)}
                        </span>
                      </button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-9 shrink-0 text-slate-500 hover:text-red-400"
                        onClick={() => void deleteConversation(conversation.id)}
                        disabled={sending}
                        aria-label={`Supprimer la conversation « ${conversation.title} »`}
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                      </Button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
