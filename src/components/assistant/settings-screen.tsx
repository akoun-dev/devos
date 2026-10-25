'use client'

/**
 * Onglet « Paramètres → Assistant vocal » — les 9 réglages FR-006.
 * Chaque changement persiste immédiatement (PUT via onSave → hook) avec toast de succès
 * et miroir localStorage (clé `devos-voice-prefs`, gérée par le hook).
 */

import { useEffect, useMemo, useState } from 'react'
import { PauseCircle, PlayCircle, Volume2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { isSpeechSynthesisSupported } from '@/lib/assistant/tts'
import type { VoicePreferences, VoiceStyle } from '@/types/assistant'

interface SettingsScreenProps {
  prefs: VoicePreferences | null
  prefsLoading: boolean
  categories: string[]
  onSave: (partial: Partial<VoicePreferences>) => void
  onSpeakTest: () => void
  onToggleSuspended: () => void
}

const LANGUAGE_OPTIONS = [
  { value: 'fr-FR', label: 'Français (fr-FR)' },
  { value: 'en-US', label: 'English (en-US)' },
  { value: 'es-ES', label: 'Español (es-ES)' },
  { value: 'de-DE', label: 'Deutsch (de-DE)' },
]

const STYLE_OPTIONS: { value: VoiceStyle; label: string; description: string }[] = [
  {
    value: 'naturel',
    label: 'Naturel',
    description: 'Phrases complètes et conversationnelles.',
  },
  {
    value: 'professionnel',
    label: 'Professionnel',
    description: 'Ton neutre et formel, adapté au travail.',
  },
  {
    value: 'bref',
    label: 'Très bref',
    description: 'Messages ultra-courts, essentiels uniquement.',
  },
]

const FIXED_REMINDER_OPTIONS = [5, 15, 30, 60]

/** Jours affichés Lun→Dim, codés 0=dim..6=sam (contrat CSV). */
const QUIET_DAYS: { value: number; label: string }[] = [
  { value: 1, label: 'Lun' },
  { value: 2, label: 'Mar' },
  { value: 3, label: 'Mer' },
  { value: 4, label: 'Jeu' },
  { value: 5, label: 'Ven' },
  { value: 6, label: 'Sam' },
  { value: 0, label: 'Dim' },
]

function parseQuietDays(csv: string): Set<number> {
  const days = csv
    .split(',')
    .map((part) => Number.parseInt(part.trim(), 10))
    .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
  return new Set(days)
}

function parseAllowedCategories(csv: string): string[] {
  return csv
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
}

function SwitchRow({
  id,
  label,
  description,
  checked,
  onCheckedChange,
  disabled,
}: {
  id: string
  label: string
  description?: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <Label htmlFor={id} className="text-sm font-medium">
          {label}
        </Label>
        {description ? <p className="mt-1 text-xs text-muted-foreground">{description}</p> : null}
      </div>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        aria-label={label}
      />
    </div>
  )
}

export function SettingsScreen({
  prefs,
  prefsLoading,
  categories,
  onSave,
  onSpeakTest,
  onToggleSuspended,
}: SettingsScreenProps) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [volumeValue, setVolumeValue] = useState<number>(100)
  /** Mode « Personnalisé » activé localement (le Select est contrôlé par prefs). */
  const [customReminder, setCustomReminder] = useState(false)

  // Voix disponibles (événement voiceschanged géré pour les navigateurs asynchrones)
  useEffect(() => {
    if (!isSpeechSynthesisSupported()) return
    const load = () => setVoices(window.speechSynthesis.getVoices())
    load()
    window.speechSynthesis.addEventListener('voiceschanged', load)
    return () => window.speechSynthesis.removeEventListener('voiceschanged', load)
  }, [])

  // Synchronise l'affichage du volume (0..100) avec les préférences (0..1)
  useEffect(() => {
    if (prefs) setVolumeValue(Math.round(prefs.volume * 100))
  }, [prefs])

  const disabled = prefs === null

  const selectedDaySet = useMemo(
    () => (prefs ? parseQuietDays(prefs.quietDays) : new Set<number>()),
    [prefs],
  )

  const allowedCategories = useMemo(
    () => (prefs ? parseAllowedCategories(prefs.allowedCategories) : []),
    [prefs],
  )

  const filteredVoices = useMemo(() => {
    const lang = (prefs?.language ?? 'fr-FR').toLowerCase()
    return voices.filter((voice) => voice.lang.toLowerCase().replace('_', '-').startsWith(lang.split('-')[0]))
  }, [voices, prefs?.language])

  const reminderSelectValue =
    customReminder ||
    !prefs ||
    !FIXED_REMINDER_OPTIONS.includes(prefs.reminderOffsetMinutes)
      ? 'custom'
      : String(prefs.reminderOffsetMinutes)

  const suspended = prefs
    ? prefs.suspended ||
      (prefs.suspendedUntil !== null && new Date(prefs.suspendedUntil).getTime() > Date.now())
    : false

  const toggleQuietDay = (day: number) => {
    if (!prefs) return
    const next = new Set(selectedDaySet)
    if (next.has(day)) {
      next.delete(day)
    } else {
      next.add(day)
    }
    const csv = QUIET_DAYS.map((entry) => entry.value)
      .filter((value) => next.has(value))
      .join(',')
    onSave({ quietDays: csv })
  }

  const toggleAllowedCategory = (category: string) => {
    if (!prefs) return
    const next = new Set(allowedCategories)
    if (next.has(category)) {
      next.delete(category)
    } else {
      next.add(category)
    }
    onSave({ allowedCategories: Array.from(next).join(',') })
  }

  if (prefsLoading && !prefs) {
    return (
      <div className="space-y-4" aria-busy="true" aria-label="Chargement des paramètres">
        {[0, 1, 2, 3].map((index) => (
          <Skeleton key={index} className="h-28 w-full rounded-lg" />
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* 1 — Général */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Général</CardTitle>
          <CardDescription>Interrupteur principal de l&apos;assistant vocal.</CardDescription>
        </CardHeader>
        <CardContent>
          <SwitchRow
            id="pref-enabled"
            label="Assistant vocal activé"
            description="Désactivé, aucune annonce vocale ni notification n'est générée."
            checked={prefs?.enabled ?? true}
            onCheckedChange={(checked) => onSave({ enabled: checked })}
            disabled={disabled}
          />
        </CardContent>
      </Card>

      {/* 2 — Rappels */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Rappels</CardTitle>
          <CardDescription>
            Délai global d&apos;anticipation avant échéance (appliqué aux tâches sans délai propre).
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="grid gap-2">
            <Label htmlFor="pref-reminder">Délai de rappel</Label>
            <Select
              value={reminderSelectValue}
              onValueChange={(value) => {
                if (value === 'custom') {
                  setCustomReminder(true)
                  return
                }
                setCustomReminder(false)
                onSave({ reminderOffsetMinutes: Number(value) })
              }}
              disabled={disabled}
            >
              <SelectTrigger id="pref-reminder" className="w-full sm:w-64" aria-label="Délai de rappel global">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FIXED_REMINDER_OPTIONS.map((minutes) => (
                  <SelectItem key={minutes} value={String(minutes)}>
                    {minutes} minutes avant
                  </SelectItem>
                ))}
                <SelectItem value="custom">Personnalisé…</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {reminderSelectValue === 'custom' ? (
            <div className="grid gap-2">
              <Label htmlFor="pref-reminder-custom">Délai personnalisé (minutes, 1 à 10080)</Label>
              <Input
                id="pref-reminder-custom"
                type="number"
                min={1}
                max={10080}
                step={1}
                value={prefs?.reminderOffsetMinutes ?? 60}
                disabled={disabled}
                onChange={(event) => {
                  const raw = Number.parseInt(event.target.value, 10)
                  if (Number.isNaN(raw)) return
                  const clamped = Math.min(10080, Math.max(1, raw))
                  onSave({ reminderOffsetMinutes: clamped })
                }}
                className="w-full sm:w-40"
              />
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* 3 — Annonces */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Annonces</CardTitle>
          <CardDescription>Choisissez les événements annoncés vocalement.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <SwitchRow
            id="pref-new-tasks"
            label="Nouvelles tâches"
            description="Annonce à la création d'une tâche (catégorie autorisée)."
            checked={prefs?.announceNewTasks ?? true}
            onCheckedChange={(checked) => onSave({ announceNewTasks: checked })}
            disabled={disabled}
          />
          <Separator />
          <SwitchRow
            id="pref-deadlines"
            label="Échéances"
            description="Annonce à l'approche puis au passage de l'échéance."
            checked={prefs?.announceDeadlines ?? true}
            onCheckedChange={(checked) => onSave({ announceDeadlines: checked })}
            disabled={disabled}
          />
          <Separator />
          <SwitchRow
            id="pref-priorities"
            label="Tâches prioritaires"
            description="Annonce quotidienne des tâches de haute et urgente priorité."
            checked={prefs?.announcePriorities ?? true}
            onCheckedChange={(checked) => onSave({ announcePriorities: checked })}
            disabled={disabled}
          />
        </CardContent>
      </Card>

      {/* 4 — Heures silencieuses */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Heures silencieuses</CardTitle>
          <CardDescription>
            Pendant la plage, les annonces sont notifiées muettement et ne seront jamais rejouées
            (pas de rattrapage).
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <SwitchRow
            id="pref-quiet-enabled"
            label="Activer les heures silencieuses"
            checked={prefs?.quietHoursEnabled ?? false}
            onCheckedChange={(checked) => onSave({ quietHoursEnabled: checked })}
            disabled={disabled}
          />
          {prefs?.quietHoursEnabled ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="pref-quiet-start">Début</Label>
                  <Input
                    id="pref-quiet-start"
                    type="time"
                    value={prefs.quietStart}
                    onChange={(event) => onSave({ quietStart: event.target.value })}
                    disabled={disabled}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="pref-quiet-end">Fin</Label>
                  <Input
                    id="pref-quiet-end"
                    type="time"
                    value={prefs.quietEnd}
                    onChange={(event) => onSave({ quietEnd: event.target.value })}
                    disabled={disabled}
                  />
                </div>
              </div>
              <fieldset className="grid gap-2">
                <legend className="text-sm font-medium">Jours concernés</legend>
                <div className="flex flex-wrap gap-x-4 gap-y-2">
                  {QUIET_DAYS.map((day) => {
                    const checkboxId = `pref-quiet-day-${day.value}`
                    return (
                      <div key={day.value} className="flex items-center gap-2">
                        <Checkbox
                          id={checkboxId}
                          checked={selectedDaySet.has(day.value)}
                          onCheckedChange={() => toggleQuietDay(day.value)}
                          disabled={disabled}
                          aria-label={`Jour silencieux : ${day.label}`}
                        />
                        <Label htmlFor={checkboxId} className="text-sm font-normal">
                          {day.label}
                        </Label>
                      </div>
                    )
                  })}
                </div>
              </fieldset>
            </>
          ) : null}
        </CardContent>
      </Card>

      {/* 5 — Style */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Style des annonces</CardTitle>
          <CardDescription>Ton des messages prononcés.</CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={prefs?.style ?? 'naturel'}
            onValueChange={(value) => onSave({ style: value as VoiceStyle })}
            className="grid gap-3 sm:grid-cols-3"
            disabled={disabled}
            aria-label="Style des annonces"
          >
            {STYLE_OPTIONS.map((option) => (
              <div
                key={option.value}
                className="flex items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-accent/40"
              >
                <RadioGroupItem value={option.value} id={`pref-style-${option.value}`} className="mt-0.5" />
                <div className="grid gap-1">
                  <Label htmlFor={`pref-style-${option.value}`} className="text-sm font-medium">
                    {option.label}
                  </Label>
                  <span className="text-xs text-muted-foreground">{option.description}</span>
                </div>
              </div>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      {/* 6 — Voix et langue */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Voix et langue</CardTitle>
          <CardDescription>
            Voix locales de votre navigateur (aucune donnée n&apos;est envoyée en ligne).
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="pref-language">Langue</Label>
            <Select
              value={prefs?.language ?? 'fr-FR'}
              onValueChange={(value) => onSave({ language: value, voice: null })}
              disabled={disabled}
            >
              <SelectTrigger id="pref-language" className="w-full sm:w-64" aria-label="Langue de l'assistant">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="pref-voice">Voix</Label>
            <Select
              value={
                prefs?.voice && filteredVoices.some((voice) => voice.name === prefs.voice)
                  ? prefs.voice
                  : 'auto'
              }
              onValueChange={(value) => onSave({ voice: value === 'auto' ? null : value })}
              disabled={disabled || !isSpeechSynthesisSupported()}
            >
              <SelectTrigger id="pref-voice" className="w-full sm:w-80" aria-label="Voix de synthèse">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Voix automatique</SelectItem>
                {filteredVoices.map((voice) => (
                  <SelectItem key={voice.name} value={voice.name}>
                    {voice.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!isSpeechSynthesisSupported() ? (
              <p className="text-xs text-amber-700 dark:text-amber-300">
                Synthèse vocale indisponible sur ce navigateur — les annonces seront notifiées
                visuellement seulement.
              </p>
            ) : filteredVoices.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Aucune voix locale disponible pour cette langue sur cet appareil.
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {/* 7 — Volume */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Volume2 className="size-4" aria-hidden="true" />
            Volume
          </CardTitle>
          <CardDescription>Volume de lecture des annonces vocales.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="pref-volume">Niveau</Label>
            <span className="text-sm font-medium tabular-nums" aria-live="polite">
              {volumeValue} %
            </span>
          </div>
          <Slider
            id="pref-volume"
            min={0}
            max={100}
            step={1}
            value={[volumeValue]}
            onValueChange={(values) => setVolumeValue(values[0] ?? 0)}
            onValueCommit={(values) => {
              const value = values[0] ?? 100
              setVolumeValue(value)
              onSave({ volume: value / 100 })
            }}
            disabled={disabled}
            aria-label="Volume des annonces vocales (0 à 100 %)"
          />
        </CardContent>
      </Card>

      {/* 8 — Catégories autorisées */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Catégories autorisées</CardTitle>
          <CardDescription>
            Seules les tâches de ces catégories seront annoncées. Aucune sélection = toutes les
            catégories autorisées.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {categories.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Créez des tâches avec des catégories pour affiner les annonces ici.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => {
                const selected = allowedCategories.includes(category)
                return (
                  <Button
                    key={category}
                    type="button"
                    variant={selected ? 'default' : 'outline'}
                    size="sm"
                    className="min-h-11 sm:min-h-9"
                    aria-pressed={selected}
                    onClick={() => toggleAllowedCategory(category)}
                    disabled={disabled}
                  >
                    {category}
                  </Button>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 9 — Confidentialité */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Confidentialité</CardTitle>
          <CardDescription>
            Contrôlez ce qui est prononcé à voix haute dans votre environnement.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <SwitchRow
            id="pref-privacy"
            label="Mode discret (annonces génériques)"
            description="Les annonces ne citent pas le titre des tâches."
            checked={prefs?.privacyMode ?? false}
            onCheckedChange={(checked) => onSave({ privacyMode: checked })}
            disabled={disabled}
          />
          <Separator />
          <SwitchRow
            id="pref-urgent-override"
            label="Les alertes urgentes contournent les heures silencieuses"
            description="Opt-in explicite : les annonces urgentes sont prononcées même en plage silencieuse."
            checked={prefs?.urgentOverrideQuiet ?? false}
            onCheckedChange={(checked) => onSave({ urgentOverrideQuiet: checked })}
            disabled={disabled}
          />
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Actions</CardTitle>
          <CardDescription>Redondance assumée avec l&apos;onglet Assistant.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button onClick={onSpeakTest} className="min-h-11 sm:min-h-9">
            <Volume2 aria-hidden="true" />
            Tester la voix
          </Button>
          <Button
            variant="outline"
            onClick={onToggleSuspended}
            disabled={disabled}
            aria-pressed={suspended}
            className="min-h-11 sm:min-h-9"
          >
            {suspended ? <PlayCircle aria-hidden="true" /> : <PauseCircle aria-hidden="true" />}
            {suspended ? 'Reprendre les annonces' : 'Suspendre les annonces'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
