'use client'

/**
 * AiChatView — Assistant IA (cahier des charges §3.3) : conversation textuelle
 * avec contextes (Général / Développement / Planification), état du modèle,
 * nouvelle conversation. Backend : POST /api/ai/chat (SDK serveur, rate limit
 * 10/5 min). Historique : session courante (persistance DB en backlog).
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { Bot, Loader2, RotateCcw, Send, Sparkles } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { ApiError, apiFetch } from '@/lib/assistant/api'
import { formatTimeFR } from '@/lib/assistant/format'
import { cn } from '@/lib/utils'
import type { AiChatResponse, ChatMessage } from '@/types/workspace'

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
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, sending])

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
          }),
        })
        setMessages((prev) => [...prev, data.message])
        setRemaining(data.remaining)
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
    [messages, sending, context, toast, onUnauthorized]
  )

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void send(input)
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Bot className="size-4 text-primary" aria-hidden="true" />
              Assistant IA
              <Badge variant="secondary" className="text-[10px]">
                Modèle serveur
              </Badge>
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              className="min-h-11 sm:min-h-9"
              onClick={() => {
                setMessages([])
                setRemaining(null)
              }}
              disabled={messages.length === 0 || sending}
            >
              <RotateCcw aria-hidden="true" />
              Nouvelle conversation
            </Button>
          </div>
          <CardDescription>
            Conversations et analyses — l&apos;IA ne modifie pas vos données : elle vous propose des
            actions à appliquer vous-même.
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
        </CardContent>
      </Card>

      {/* Conversation */}
      <Card className="flex min-h-[50dvh] flex-col">
        <CardContent className="flex flex-1 flex-col gap-3 p-4">
          <div ref={listRef} className="devos-scroll flex-1 space-y-3 overflow-y-auto pr-1" aria-live="polite" aria-label="Conversation">
            {messages.length === 0 && !sending ? (
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
                      : 'border bg-muted/50 text-foreground'
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
