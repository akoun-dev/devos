'use client'

/**
 * AiChatView — Assistant IA (cahier des charges §3.3 + contrat v1.4) :
 * conversation textuelle avec contextes (Général / Développement / Planification),
 * **historique persistant** (conversations en base — GET/PATCH/DELETE
 * /api/ai/conversations, POST /api/ai/chat avec conversationId), état du modèle,
 * nouvelle conversation. Rate limit serveur : 10/5 min (remaining affiché).
 * SDK z-ai-web-dev-sdk : BACKEND uniquement (aucun appel direct client).
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { Bot, History, Loader2, MessageSquare, RotateCcw, Send, Sparkles, Trash2 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { ApiError, apiFetch } from '@/lib/assistant/api'
import { formatTimeFR } from '@/lib/assistant/format'
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

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void send(input)
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Historique persistant (contrat v1.4) */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Bot className="size-4 text-primary" aria-hidden="true" />
              Assistant IA
              <Badge variant="secondary" className="text-[10px]">
                Historique enregistré
              </Badge>
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              className="min-h-11 sm:min-h-9"
              onClick={resetConversation}
              disabled={messages.length === 0 || sending}
            >
              <RotateCcw aria-hidden="true" />
              Nouvelle conversation
            </Button>
          </div>
          <CardDescription>
            Conversations et analyses — l&apos;IA ne modifie pas vos données : elle vous propose des
            actions à appliquer vous-même. Vos conversations sont conservées.
            {remaining !== null ? ` Requêtes restantes : ${remaining}.` : ''}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Contexte :</span>
            <Select value={context} onValueChange={(value) => setContext(value as ChatContext)}>
              <SelectTrigger className="h-11 w-full sm:h-9 sm:w-52" aria-label="Contexte de la conversation">
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
          </div>

          <div>
            <p className="flex items-center gap-1.5 pb-1 text-xs font-medium text-muted-foreground">
              <History className="size-3.5" aria-hidden="true" />
              Conversations récentes
            </p>
            {conversationsLoading ? (
              <div className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Chargement de l&apos;historique…
              </div>
            ) : conversations.length === 0 ? (
              <p className="rounded-lg border border-dashed px-3 py-2 text-sm text-muted-foreground">
                Aucune conversation enregistrée — votre premier échange apparaîtra ici.
              </p>
            ) : (
              <ul className="devos-scroll max-h-44 space-y-1 overflow-y-auto pr-1">
                {conversations.map((conversation) => {
                  const isCurrent = conversation.id === conversationId
                  return (
                    <li key={conversation.id} className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => void openConversation(conversation.id)}
                        aria-current={isCurrent ? 'true' : undefined}
                        className={cn(
                          'group flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-lg border px-3 py-1.5 text-left text-sm transition-colors',
                          isCurrent
                            ? 'border-primary/40 bg-primary/10 text-primary'
                            : 'hover:bg-muted',
                        )}
                      >
                        <MessageSquare className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                        <span className="min-w-0 flex-1 truncate">{conversation.title}</span>
                        <span className="shrink-0 text-[11px] text-muted-foreground">
                          {conversation.messageCount} msg · {formatTimeFR(conversation.updatedAt)}
                        </span>
                      </button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-9 shrink-0 text-muted-foreground hover:text-destructive"
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
        </CardContent>
      </Card>

      {/* Conversation courante */}
      <Card className="flex min-h-[50dvh] flex-col">
        <CardContent className="flex flex-1 flex-col gap-3 p-4">
          {conversationTitle ? (
            <p className="truncate text-xs font-medium text-muted-foreground" aria-live="polite">
              {openingConversation ? 'Chargement…' : `Conversation : ${conversationTitle}`}
            </p>
          ) : null}
          <div ref={listRef} className="devos-scroll flex-1 space-y-3 overflow-y-auto pr-1" aria-live="polite" aria-label="Conversation">
            {messages.length === 0 && !sending && !openingConversation ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                <Sparkles className="size-8 text-muted-foreground" aria-hidden="true" />
                <p className="text-sm text-muted-foreground">
                  Posez une question ou choisissez une suggestion — réponses en français.
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {SUGGESTIONS[context].map((suggestion) => (
                    <Button
                      key={suggestion}
                      variant="outline"
                      size="sm"
                      className="min-h-11 sm:min-h-9"
                      onClick={() => void send(suggestion)}
                    >
                      {suggestion}
                    </Button>
                  ))}
                </div>
              </div>
            ) : null}

            {messages.map((message, index) => (
              <div
                key={`${message.at}-${index}`}
                className={cn('flex', message.role === 'user' ? 'justify-end' : 'justify-start')}
              >
                <div
                  className={cn(
                    'max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm sm:max-w-[75%]',
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'border bg-muted/50 text-foreground',
                  )}
                >
                  {message.content}
                  <span className={cn('mt-1 block text-[10px]', message.role === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
                    {formatTimeFR(message.at)}
                  </span>
                </div>
              </div>
            ))}

            {sending ? (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  L&apos;assistant rédige…
                </div>
              </div>
            ) : null}
          </div>

          <form onSubmit={handleSubmit} className="grid gap-2 border-t pt-3">
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
              maxLength={4_000}
              placeholder="Votre message… (Entrée pour envoyer, Maj+Entrée pour une nouvelle ligne)"
              aria-label="Message pour l'assistant IA"
              disabled={sending}
            />
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">{input.length}/4000</span>
              <Button type="submit" disabled={sending || !input.trim()} className="min-h-11 sm:min-h-9">
                {sending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Send aria-hidden="true" />}
                Envoyer
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
