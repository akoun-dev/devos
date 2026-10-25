/**
 * Helpers de formatage fr-FR (Intl) — aucune dépendance externe.
 */

const timeFormatter = new Intl.DateTimeFormat('fr-FR', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
})

const dateTimeFormatter = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
})

/** "14:32:05" */
export function formatTimeFR(input: string | Date | null | undefined): string {
  if (!input) return '—'
  const date = typeof input === 'string' ? new Date(input) : input
  if (Number.isNaN(date.getTime())) return '—'
  return timeFormatter.format(date)
}

/** "mer. 12 févr., 14:30" */
export function formatDateTimeFR(input: string | Date | null | undefined): string {
  if (!input) return '—'
  const date = typeof input === 'string' ? new Date(input) : input
  if (Number.isNaN(date.getTime())) return '—'
  return dateTimeFormatter.format(date)
}

/**
 * Indicateur relatif pour une échéance future : "dans 25 min" / "dans 3 h" / "dans 2 j".
 * @returns null si l'échéance est passée ou invalide.
 */
export function formatDueRelative(iso: string | null | undefined, now: Date = new Date()): string | null {
  if (!iso) return null
  const due = new Date(iso)
  if (Number.isNaN(due.getTime())) return null
  const diffMs = due.getTime() - now.getTime()
  if (diffMs <= 0) return null
  const minutes = Math.round(diffMs / 60_000)
  if (minutes < 60) return `dans ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 48) return `dans ${hours} h`
  const days = Math.floor(hours / 24)
  return `dans ${days} j`
}

/** Convertit une valeur datetime-local ("2026-02-12T14:30") en ISO 8601, ou null si vide/invalide. */
export function datetimeLocalToIso(value: string): string | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString()
}
