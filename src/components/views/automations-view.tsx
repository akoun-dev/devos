'use client'

/**
 * AutomationsView — vue Automatisations (cahier des charges §3 + contrat v1.4).
 * Scénarios déclenchés selon conditions et horaires : déclencheur « Horaire »
 * (HH:MM + jours, message personnalisé optionnel) ou « Condition » (tâches en
 * retard ≥ seuil), exécution par le tick existant (+ test manuel), historique
 * des exécutions (10 dernières). Messages template uniquement (ADR-002).
 */

import { useCallback, useEffect, useState } from 'react'
import { CalendarClock, GitCompareArrows, History, Loader2, Pencil, Play, Plus, Trash2, Workflow, Zap } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { formatTimeFR } from '@/lib/assistant/format'
import { cn } from '@/lib/utils'
import type { Automation, AutomationRun, AutomationTriggerType } from '@/types/workspace'

const DAY_LABELS: { value: number; label: string }[] = [
  { value: 1, label: 'Lun' },
  { value: 2, label: 'Mar' },
  { value: 3, label: 'Mer' },
  { value: 4, label: 'Jeu' },
  { value: 5, label: 'Ven' },
  { value: 6, label: 'Sam' },
  { value: 0, label: 'Dim' },
]

const DEFAULT_DAYS = [1, 2, 3, 4, 5]

interface AutomationFormState {
  name: string
  triggerType: AutomationTriggerType
  scheduleTime: string
  scheduleDays: number[]
  threshold: string
  message: string
}

const EMPTY_FORM: AutomationFormState = {
  name: '',
  triggerType: 'schedule',
  scheduleTime: '08:00',
  scheduleDays: DEFAULT_DAYS,
  threshold: '1',
  message: '',
}

function parseDays(csv: string): number[] {
  return csv
    .split(',')
    .map((part) => Number(part.trim()))
    .filter((day) => day >= 0 && day <= 6)
}

function describeTrigger(automation: Automation): string {
  if (automation.triggerType === 'schedule') {
    const days = parseDays(automation.scheduleDays)
    const labels = DAY_LABELS.filter((day) => days.includes(day.value)).map((day) => day.label)
    const daysText = labels.length === 7 ? 'tous les jours' : labels.join(' ') || 'aucun jour'
    return `Chaque ${daysText} à ${automation.scheduleTime ?? '—'} (UTC)`
  }
  return `Si ${automation.threshold ?? 1} tâche${(automation.threshold ?? 1) > 1 ? 's' : ''} en retard ou plus`
}

interface AutomationsViewProps {
  automations: Automation[]
  automationsLoading: boolean
  onCreate: (payload: {
    name: string
    triggerType: AutomationTriggerType
    scheduleTime?: string
    scheduleDays?: string
    conditionType?: 'overdue_count'
    threshold?: number
    message?: string
  }) => Promise<unknown>
  onUpdate: (id: string, payload: Partial<Omit<Automation, 'id' | 'createdAt' | 'updatedAt' | 'lastRunAt'>>) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onRun: (id: string) => Promise<AutomationRun | null>
  onFetchRuns: (id: string) => Promise<{ automation: Automation; runs: AutomationRun[] } | null>
}

export function AutomationsView({
  automations,
  automationsLoading,
  onCreate,
  onUpdate,
  onDelete,
  onRun,
  onFetchRuns,
}: AutomationsViewProps) {
  const { toast } = useToast()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Automation | null>(null)
  const [form, setForm] = useState<AutomationFormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [runningId, setRunningId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<Automation | null>(null)
  const [historyFor, setHistoryFor] = useState<Automation | null>(null)
  const [history, setHistory] = useState<AutomationRun[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  const openCreate = useCallback(() => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setDialogOpen(true)
  }, [])

  const openEdit = useCallback((automation: Automation) => {
    setEditing(automation)
    setForm({
      name: automation.name,
      triggerType: automation.triggerType,
      scheduleTime: automation.scheduleTime ?? '08:00',
      scheduleDays: parseDays(automation.scheduleDays),
      threshold: String(automation.threshold ?? 1),
      message: automation.message ?? '',
    })
    setDialogOpen(true)
  }, [])

  const toggleDay = (day: number) => {
    setForm((prev) => ({
      ...prev,
      scheduleDays: prev.scheduleDays.includes(day)
        ? prev.scheduleDays.filter((value) => value !== day)
        : [...prev.scheduleDays, day].sort((a, b) => a - b),
    }))
  }

  const handleSave = async () => {
    if (saving) return
    const name = form.name.trim()
    if (!name) {
      toast({ title: 'Nom requis', variant: 'destructive' })
      return
    }
    if (form.triggerType === 'schedule' && form.scheduleDays.length === 0) {
      toast({ title: 'Choisissez au moins un jour', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      if (editing) {
        await onUpdate(editing.id, {
          name,
          triggerType: form.triggerType,
          ...(form.triggerType === 'schedule'
            ? {
                scheduleTime: form.scheduleTime,
                scheduleDays: form.scheduleDays.join(','),
                message: form.message.trim() ? form.message.trim() : null,
                conditionType: null,
                threshold: null,
              }
            : {
                conditionType: 'overdue_count',
                threshold: Math.max(1, Number(form.threshold) || 1),
                message: null,
              }),
        })
        toast({ title: 'Automatisation mise à jour' })
      } else {
        await onCreate({
          name,
          triggerType: form.triggerType,
          ...(form.triggerType === 'schedule'
            ? {
                scheduleTime: form.scheduleTime,
                scheduleDays: form.scheduleDays.join(','),
                ...(form.message.trim() ? { message: form.message.trim() } : {}),
              }
            : {
                conditionType: 'overdue_count',
                threshold: Math.max(1, Number(form.threshold) || 1),
              }),
        })
        toast({ title: 'Automatisation créée', description: 'Elle s’exécutera via le tick de l’assistant (30 s).' })
      }
      setDialogOpen(false)
    } catch (error) {
      toast({
        title: 'Enregistrement impossible',
        description: error instanceof Error ? error.message : undefined,
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleRun = async (automation: Automation) => {
    if (runningId) return
    setRunningId(automation.id)
    try {
      const run = await onRun(automation.id)
      if (run) {
        toast({ title: `« ${automation.name} » exécutée`, description: run.message ?? undefined })
      }
    } catch (error) {
      toast({
        title: 'Exécution impossible',
        description: error instanceof Error ? error.message : undefined,
        variant: 'destructive',
      })
    } finally {
      setRunningId(null)
    }
  }

  const openHistory = useCallback(async (automation: Automation) => {
    setHistoryFor(automation)
    setHistory([])
    setHistoryLoading(true)
    try {
      const data = await onFetchRuns(automation.id)
      setHistory(data?.runs ?? [])
    } finally {
      setHistoryLoading(false)
    }
  }, [onFetchRuns])

  useEffect(() => {
    if (!historyFor) return
    const updated = automations.find((automation) => automation.id === historyFor.id)
    if (updated) setHistoryFor(updated)
  }, [automations, historyFor])

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Workflow className="size-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              Automatisations
            </CardTitle>
            <Button size="sm" className="min-h-11 sm:min-h-9" onClick={openCreate}>
              <Plus aria-hidden="true" />
              Nouvelle automatisation
            </Button>
          </div>
          <CardDescription>
            Scénarios déclenchés selon des conditions et des horaires — annoncés par votre assistant
            vocal. Les horaires sont exprimés en UTC (fuseau du serveur) ; en heures silencieuses,
            l&apos;annonce est remplacée par une notification muette.
          </CardDescription>
        </CardHeader>
      </Card>

      {automationsLoading ? (
        <div className="flex items-center gap-2 rounded-lg border px-4 py-3 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          Chargement des automatisations…
        </div>
      ) : automations.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-8 text-center">
            <Zap className="size-8 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">
              Aucune automatisation — créez un scénario « Horaire » (résumé quotidien) ou
              « Condition » (alerte tâches en retard).
            </p>
          </CardContent>
        </Card>
      ) : (
        <ul className="grid gap-3">
          {automations.map((automation) => (
            <li key={automation.id}>
              <Card className={cn(!automation.enabled && 'opacity-70')}>
                <CardContent className="flex flex-col gap-3 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                        <span className="truncate">{automation.name}</span>
                        {automation.triggerType === 'schedule' ? (
                          <Badge variant="outline" className="gap-1 text-[10px]">
                            <CalendarClock className="size-3" aria-hidden="true" />
                            Horaire
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1 text-[10px]">
                            <GitCompareArrows className="size-3" aria-hidden="true" />
                            Condition
                          </Badge>
                        )}
                        {!automation.enabled ? (
                          <Badge variant="secondary" className="text-[10px]">
                            Désactivée
                          </Badge>
                        ) : null}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">{describeTrigger(automation)}</p>
                      {automation.triggerType === 'schedule' && automation.message ? (
                        <p className="mt-1 line-clamp-2 text-xs italic text-muted-foreground">
                          Message : « {automation.message} »
                        </p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Switch
                        checked={automation.enabled}
                        onCheckedChange={(checked) => void onUpdate(automation.id, { enabled: checked })}
                        aria-label={`${automation.enabled ? 'Désactiver' : 'Activer'} « ${automation.name} »`}
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-2">
                    <span className="text-[11px] text-muted-foreground">
                      Dernière exécution : {automation.lastRunAt ? formatTimeFR(automation.lastRunAt) : 'jamais'}
                    </span>
                    <div className="flex flex-wrap items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="min-h-11 sm:min-h-9"
                        onClick={() => void handleRun(automation)}
                        disabled={runningId !== null}
                      >
                        {runningId === automation.id ? (
                          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                        ) : (
                          <Play aria-hidden="true" />
                        )}
                        Tester
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="min-h-11 sm:min-h-9"
                        onClick={() => void openHistory(automation)}
                      >
                        <History aria-hidden="true" />
                        Historique
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-9 text-muted-foreground hover:text-foreground"
                        onClick={() => openEdit(automation)}
                        aria-label={`Modifier « ${automation.name} »`}
                      >
                        <Pencil className="size-4" aria-hidden="true" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-9 text-muted-foreground hover:text-destructive"
                        onClick={() => setDeleting(automation)}
                        aria-label={`Supprimer « ${automation.name} »`}
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}

      {/* Dialog création / édition */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Modifier l’automatisation' : 'Nouvelle automatisation'}</DialogTitle>
            <DialogDescription>
              Déclencheur « Horaire » (annonce planifiée) ou « Condition » (alerte tâches en retard).
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="automation-name">Nom</Label>
              <Input
                id="automation-name"
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                maxLength={80}
                placeholder="Ex. : Résumé du matin"
              />
            </div>
            <div className="grid gap-2">
              <Label>Déclencheur</Label>
              <Select
                value={form.triggerType}
                onValueChange={(value) => setForm((prev) => ({ ...prev, triggerType: value as AutomationTriggerType }))}
              >
                <SelectTrigger aria-label="Type de déclencheur">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="schedule">Horaire — chaque jour à HH:MM (UTC)</SelectItem>
                  <SelectItem value="condition">Condition — tâches en retard ≥ seuil</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.triggerType === 'schedule' ? (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="automation-time">Heure (UTC)</Label>
                  <Input
                    id="automation-time"
                    type="time"
                    value={form.scheduleTime}
                    onChange={(event) => setForm((prev) => ({ ...prev, scheduleTime: event.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Jours</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {DAY_LABELS.map((day) => {
                      const checked = form.scheduleDays.includes(day.value)
                      return (
                        <label
                          key={day.value}
                          className={cn(
                            'flex min-h-11 cursor-pointer items-center gap-1.5 rounded-lg border px-3 text-sm transition-colors',
                            checked ? 'border-primary/40 bg-primary/10 text-primary' : 'hover:bg-muted',
                          )}
                        >
                          <Checkbox checked={checked} onCheckedChange={() => toggleDay(day.value)} aria-label={day.label} />
                          {day.label}
                        </label>
                      )
                    })}
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="automation-message">Message personnalisé (optionnel)</Label>
                  <Textarea
                    id="automation-message"
                    value={form.message}
                    onChange={(event) => setForm((prev) => ({ ...prev, message: event.target.value }))}
                    maxLength={500}
                    rows={2}
                    placeholder="Ex. : Bonne journée ! Pense à vérifier tes priorités."
                  />
                </div>
              </>
            ) : (
              <div className="grid gap-2">
                <Label htmlFor="automation-threshold">Seuil de tâches en retard</Label>
                <Input
                  id="automation-threshold"
                  type="number"
                  min={1}
                  max={99}
                  value={form.threshold}
                  onChange={(event) => setForm((prev) => ({ ...prev, threshold: event.target.value }))}
                />
                <p className="text-xs text-muted-foreground">
                  Annonce une fois par jour maximum (déduplication serveur).
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" className="min-h-11 sm:min-h-9" onClick={() => setDialogOpen(false)} disabled={saving}>
              Annuler
            </Button>
            <Button className="min-h-11 sm:min-h-9" onClick={() => void handleSave()} disabled={saving}>
              {saving ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
              {editing ? 'Enregistrer' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Historique des exécutions */}
      <Dialog open={historyFor !== null} onOpenChange={(open) => (!open ? setHistoryFor(null) : undefined)}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Historique — {historyFor?.name}</DialogTitle>
            <DialogDescription>10 dernières exécutions (les plus récentes d’abord).</DialogDescription>
          </DialogHeader>
          {historyLoading ? (
            <div className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Chargement…
            </div>
          ) : history.length === 0 ? (
            <p className="rounded-lg border border-dashed px-3 py-3 text-sm text-muted-foreground">
              Aucune exécution enregistrée pour le moment.
            </p>
          ) : (
            <ul className="devos-scroll max-h-72 space-y-2 overflow-y-auto pr-1">
              {history.map((run) => (
                <li key={run.id} className="rounded-lg border px-3 py-2 text-sm">
                  <p className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">
                      {run.trigger}
                    </Badge>
                    <Badge variant={run.status === 'annonce' ? 'secondary' : 'outline'} className="text-[10px]">
                      {run.status}
                    </Badge>
                    <span className="ml-auto text-[11px] text-muted-foreground">
                      {run.firedAt ? formatTimeFR(run.firedAt) : formatTimeFR(run.createdAt)}
                    </span>
                  </p>
                  {run.message ? <p className="mt-1 text-xs text-muted-foreground">{run.message}</p> : null}
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmation de suppression */}
      <AlertDialog open={deleting !== null} onOpenChange={(open) => (!open ? setDeleting(null) : undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer « {deleting?.name} » ?</AlertDialogTitle>
            <AlertDialogDescription>
              L&apos;automatisation et son historique d&apos;exécutions seront supprimés définitivement.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-11 sm:min-h-9">Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="min-h-11 sm:min-h-9"
              onClick={() => {
                if (deleting) void onDelete(deleting.id)
                setDeleting(null)
              }}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
