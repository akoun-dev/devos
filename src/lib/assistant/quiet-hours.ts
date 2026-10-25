/**
 * quiet-hours.ts — fenêtres silencieuses de l'assistant vocal.
 *
 * FUSEAU : volontairement en UTC (getUTCHours / getUTCDay) — le fuseau cible du
 * produit est Africa/Abidjan = UTC+0 (cf. ADR-001), donc UTC ≡ heure locale.
 * Si un autre fuseau devient nécessaire, ce module est le seul à modifier.
 */

export interface QuietHoursPrefs {
  quietHoursEnabled: boolean;
  quietStart: string;
  quietEnd: string;
  quietDays: string;
}

export interface QuietHoursResult {
  active: boolean;
  /** "22:00-07:00" si actif, sinon null. */
  window: string | null;
}

/** Parse "HH:mm" → minutes depuis minuit, ou null si invalide. */
export function parseHHmm(value: string): number | null {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value?.trim() ?? "");
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

/** "0,1,2" → Set(0,1,2). Jour invalide ignoré. Vide/tout invalide → tous les jours. */
export function parseQuietDays(csv: string): Set<number> {
  const days = new Set<number>();
  for (const part of (csv ?? "").split(",")) {
    const n = Number(part.trim());
    if (Number.isInteger(n) && n >= 0 && n <= 6) days.add(n);
  }
  if (days.size === 0) for (let i = 0; i <= 6; i++) days.add(i);
  return days;
}

/**
 * Détermine si `now` tombe dans la fenêtre silencieuse.
 * - Gère le wrap minuit (22:00 → 07:00).
 * - Les jours (CSV 0..6, 0 = dimanche) s'appliquent au jour du DÉBUT de fenêtre
 *   (23h un lundi avec fenêtre 22:00→07:00 = jour du lundi).
 * - start === end → fenêtre de longueur nulle → jamais actif.
 */
export function isQuietHours(prefs: QuietHoursPrefs, now: Date): QuietHoursResult {
  const label = `${prefs.quietStart}-${prefs.quietEnd}`;
  if (!prefs.quietHoursEnabled) return { active: false, window: null };

  const start = parseHHmm(prefs.quietStart);
  const end = parseHHmm(prefs.quietEnd);
  if (start === null || end === null || start === end) return { active: false, window: null };

  const nowMin = now.getUTCHours() * 60 + now.getUTCMinutes();

  // Jour (UTC) du début de la fenêtre courante :
  // - fenêtre sans wrap : le jour courant si now ≥ start, sinon la fenêtre n'a pas commencé aujourd'hui
  //   (mais elle peut avoir commencé hier si wrap).
  // - fenêtre avec wrap : now ≥ start → aujourd'hui ; now < end → hier.
  let windowStartDayOffset = 0; // 0 = aujourd'hui, -1 = hier
  if (start < end) {
    if (nowMin < start) return { active: false, window: null };
  } else {
    // wrap minuit
    windowStartDayOffset = nowMin >= start ? 0 : -1;
  }

  const windowStartDay = new Date(now);
  windowStartDay.setUTCDate(windowStartDay.getUTCDate() + windowStartDayOffset);
  const allowedDays = parseQuietDays(prefs.quietDays);
  if (!allowedDays.has(windowStartDay.getUTCDay())) return { active: false, window: null };

  let active: boolean;
  if (start < end) {
    active = nowMin >= start && nowMin < end;
  } else {
    active = nowMin >= start || nowMin < end;
  }
  return { active, window: active ? label : null };
}
