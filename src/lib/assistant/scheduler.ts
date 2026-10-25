/**
 * scheduler.ts — CŒUR du ReminderScheduler (ADR-002 : architecture « état dérivé »).
 *
 * Deux couches :
 *  - `computeTick(now, prefs, tasks, recentLogs)` : PUR et testable. Détermine les
 *    décisions du tick (annonces + expires) et le filtrage silencieux, SANS persister.
 *  - `runTick(now)` : orchestration — charge les données, applique les décisions,
 *    déduplique via ReminderLog (contrainte DB @@unique(taskId,type,scheduledFor)),
 *    tente la reformulation LLM (optionnelle, ADR-002) et persiste.
 *
 * Règles produit non négociables :
 *  - Templates TOUJOURS d'abord ; LLM = reformulation décorative avec fallback.
 *  - Tâche terminee/annulee → ne déclenche JAMAIS rien (AC-007).
 *  - Zéro rattrapage après silencieux / suspension / délai dépassé (logs 'expire').
 *  - Anti-doublons garantis par contrainte DB + résolution de log avant création.
 */

import type { ReminderLog, Task, VoicePreferences } from "@prisma/client";
import { db } from "@/lib/db";
import { reformulate } from "./ai";
import { isQuietHours, type QuietHoursResult } from "./quiet-hours";
import {
  buildTemplateMessage,
  formatDelay,
  humanizeDelay,
  type AnnouncementType,
  type AssistantStyle,
} from "./templates";

const MINUTE_MS = 60_000;
const REMINDER_GRACE_MIN = 15; // fenêtre de grâce reminder/deadline : scheduledFor..+15 min
const NEW_TASK_WINDOW_SEC = 45; // annonce new_task uniquement pour tâches < 45 s
const ANTI_FRENZY_MS = 60_000; // anti-frénésie : 1 log new_task / 60 s max
const PRIORITY_SET = new Set(["haute", "urgente"]);
const STYLES: AssistantStyle[] = ["naturel", "professionnel", "bref"];

// ─── Types publics ────────────────────────────────────────────────────────────

/** Announcement prête à prononcer (contrat API v1 — .ai/API_CONTRACTS.md). */
export interface Announcement {
  id: string; // ReminderLog id = clé anti-doublon client
  type: AnnouncementType;
  taskId: string | null;
  title: string;
  message: string;
  messageSource: "ia" | "template";
  priority: string;
  dueAt: string | null;
  urgent: boolean;
  spoken: boolean;
}

export interface TickResult {
  announcements: Announcement[];
  now: Date;
  quietHours: QuietHoursResult;
}

// ─── Types internes ───────────────────────────────────────────────────────────

type CandidateKind =
  | { kind: "future" }
  | { kind: "eligible"; scheduledFor: Date }
  | { kind: "passed"; scheduledFor: Date };

interface DecisionBase {
  type: AnnouncementType;
  task: Task;
  scheduledFor: Date;
}

type Decision =
  | (DecisionBase & {
      action: "announce";
      urgent: boolean;
      spoken: boolean;
      delayMinutes: number | null;
      templateMessage: string;
    })
  | (DecisionBase & { action: "expire"; taskId: string | null; reason: string });

// ─── Utilitaires ──────────────────────────────────────────────────────────────

function asStyle(value: string): AssistantStyle {
  return (STYLES as string[]).includes(value) ? (value as AssistantStyle) : "naturel";
}

function isUrgent(priority: string): boolean {
  return priority === "urgente";
}

function isCategoryAllowed(category: string, allowedCategories: string): boolean {
  const csv = (allowedCategories ?? "").trim();
  if (!csv) return true; // "" = toutes
  const allowed = csv
    .split(",")
    .map((c) => c.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes((category ?? "").trim().toLowerCase());
}

/** Minuit UTC du jour courant (bucket priority : 1 annonce/jour/tâche). */
export function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
}

/** Délai (min) entre maintenant et l'échéance — pour reminder/deadline. */
function delayMinutesFor(task: Task, now: Date): number | null {
  if (!task.dueAt) return null;
  return Math.round((task.dueAt.getTime() - now.getTime()) / MINUTE_MS);
}

/**
 * Filtrage silencieux (spéc d) : heures silencieuses actives → seul une annonce
 * 'urgente' avec urgentOverrideQuiet explicite est prononcée.
 */
export function computeSpoken(quietActive: boolean, urgent: boolean, urgentOverrideQuiet: boolean): boolean {
  return !quietActive || (urgent && urgentOverrideQuiet);
}

function logKey(taskId: string | null, type: string, scheduledFor: Date): string {
  return `${taskId ?? "null"}|${type}|${scheduledFor.toISOString()}`;
}

// ─── Candidats dérivés (purs) ─────────────────────────────────────────────────

/** Rappel anticipé : dueAt − offset (offset tâche sinon global), fenêtre +15 min. */
function reminderCandidate(task: Task, prefs: VoicePreferences, now: Date): CandidateKind | null {
  if (!task.reminderEnabled || !task.dueAt) return null;
  const offset = task.reminderOffsetMinutes ?? prefs.reminderOffsetMinutes;
  const scheduledFor = new Date(task.dueAt.getTime() - offset * MINUTE_MS);
  const t = scheduledFor.getTime();
  if (now.getTime() < t) return { kind: "future" };
  if (now.getTime() <= t + REMINDER_GRACE_MIN * MINUTE_MS) return { kind: "eligible", scheduledFor };
  return { kind: "passed", scheduledFor };
}

/** Échéance : fenêtre [dueAt, dueAt+15 min]. */
function deadlineCandidate(task: Task, prefs: VoicePreferences, now: Date): CandidateKind | null {
  if (!prefs.announceDeadlines || !task.dueAt) return null;
  const t = task.dueAt.getTime();
  if (now.getTime() < t) return { kind: "future" };
  if (now.getTime() <= t + REMINDER_GRACE_MIN * MINUTE_MS) return { kind: "eligible", scheduledFor: task.dueAt };
  return { kind: "passed", scheduledFor: task.dueAt };
}

/** Nouvelle tâche : createdAt < 45 s + catégorie autorisée. Pas d'expire rétrospectif. */
function newTaskCandidate(task: Task, prefs: VoicePreferences, now: Date): CandidateKind | null {
  if (!prefs.announceNewTasks) return null;
  if (!isCategoryAllowed(task.category, prefs.allowedCategories)) return null;
  const t = task.createdAt.getTime();
  if (now.getTime() < t) return { kind: "future" };
  if (now.getTime() <= t + NEW_TASK_WINDOW_SEC * 1000) return { kind: "eligible", scheduledFor: task.createdAt };
  return null; // fenêtre dépassée : PAS de log expire (éviter le flood historique)
}

/** Priorité haute/urgente : bucket minuit UTC → 1 annonce/jour/tâche via clé unique. */
function priorityCandidate(task: Task, prefs: VoicePreferences, now: Date): CandidateKind | null {
  if (!prefs.announcePriorities) return null;
  if (!PRIORITY_SET.has(task.priority)) return null;
  return { kind: "eligible", scheduledFor: startOfUtcDay(now) };
}

// ─── computeTick (PUR) ────────────────────────────────────────────────────────

/**
 * Calcule les décisions du tick sans persister.
 * Ordre : (a/b) désactivé/suspendu → expires de fenêtres dépassées, rien d'autre ;
 * (c) candidats dérivés ; (d) filtrage silencieux (spoken) ; messages = templates.
 * La déduplication (e) est résolue au moment de la persistance (runTick).
 */
export function computeTick(
  now: Date,
  prefs: VoicePreferences,
  tasks: Task[],
  recentLogs: ReminderLog[],
): { decisions: Decision[]; quietHours: QuietHoursResult } {
  const quietHours = isQuietHours(prefs, now);
  const suspendedByUntil = Boolean(prefs.suspendedUntil && prefs.suspendedUntil.getTime() > now.getTime());
  const active = prefs.enabled && !prefs.suspended && !suspendedByUntil;
  const activeTasks = tasks.filter((t) => t.status === "en_cours"); // AC-007
  const decisions: Decision[] = [];

  // (a)/(b) Désactivé ou suspendu : annonces=[] ; les candidats dont la fenêtre
  // est DÉJÀ dépassée sont marqués 'expire' (zéro rattrapage au retour).
  if (!active) {
    for (const task of activeTasks) {
      const rem = reminderCandidate(task, prefs, now);
      if (rem?.kind === "passed") {
        decisions.push({ action: "expire", type: "reminder", task, taskId: task.id, scheduledFor: rem.scheduledFor, reason: "inactif_fenetre_depassee" });
      }
      const dl = deadlineCandidate(task, prefs, now);
      if (dl?.kind === "passed") {
        decisions.push({ action: "expire", type: "deadline", task, taskId: task.id, scheduledFor: dl.scheduledFor, reason: "inactif_fenetre_depassee" });
      }
    }
    return { decisions, quietHours };
  }

  // Anti-frénésie new_task : un log new_task (quel que soit son statut) créé
  // il y a < 60 s bloque l'annonce suivante (les décisions de CE tick comptent aussi).
  let newTaskLogRecent = recentLogs.some(
    (l) => l.type === "new_task" && now.getTime() - l.createdAt.getTime() < ANTI_FRENZY_MS,
  );

  for (const task of activeTasks) {
    // Rappel anticipé — toujours si reminderEnabled (indépendant d'announceDeadlines).
    const rem = reminderCandidate(task, prefs, now);
    if (rem?.kind === "passed") {
      decisions.push({ action: "expire", type: "reminder", task, taskId: task.id, scheduledFor: rem.scheduledFor, reason: "fenetre_depassee" });
    } else if (rem?.kind === "eligible") {
      decisions.push(buildAnnounce("reminder", task, rem.scheduledFor, now, prefs, quietHours.active));
    }

    // Échéance.
    const dl = deadlineCandidate(task, prefs, now);
    if (dl?.kind === "passed") {
      decisions.push({ action: "expire", type: "deadline", task, taskId: task.id, scheduledFor: dl.scheduledFor, reason: "fenetre_depassee" });
    } else if (dl?.kind === "eligible") {
      decisions.push(buildAnnounce("deadline", task, dl.scheduledFor, now, prefs, quietHours.active));
    }

    // Nouvelle tâche (+ anti-frénésie 60 s).
    const nt = newTaskCandidate(task, prefs, now);
    if (nt?.kind === "eligible") {
      if (newTaskLogRecent) {
        decisions.push({ action: "expire", type: "new_task", task, taskId: task.id, scheduledFor: nt.scheduledFor, reason: "anti_frenesie" });
        newTaskLogRecent = true; // le log 'expire' compte aussi pour les candidats suivants
      } else {
        decisions.push(buildAnnounce("new_task", task, nt.scheduledFor, now, prefs, quietHours.active));
        newTaskLogRecent = true;
      }
    }

    // Priorité haute/urgente — 1/jour/tâche (bucket minuit UTC, dédoublonné par clé unique).
    const pr = priorityCandidate(task, prefs, now);
    if (pr?.kind === "eligible") {
      decisions.push(buildAnnounce("priority", task, pr.scheduledFor, now, prefs, quietHours.active));
    }
  }

  return { decisions, quietHours };
}

interface AnnounceFields {
  urgent: boolean;
  spoken: boolean;
  delayMinutes: number | null;
  templateMessage: string;
}

/** Délai pertinent pour le message : reminder/deadline → dueAt−now ; sinon null. */
function delayForType(type: AnnouncementType, task: Task, now: Date): number | null {
  return type === "reminder" || type === "deadline" ? delayMinutesFor(task, now) : null;
}

function announceFields(
  type: AnnouncementType,
  task: Task,
  now: Date,
  prefs: VoicePreferences,
  quietActive: boolean,
): AnnounceFields {
  const urgent = isUrgent(task.priority);
  const spoken = computeSpoken(quietActive, urgent, prefs.urgentOverrideQuiet);
  const delayMinutes = delayForType(type, task, now);
  const templateMessage = buildTemplateMessage(type, asStyle(prefs.style), prefs.privacyMode, {
    title: task.title,
    delayText: delayMinutes !== null ? humanizeDelay(delayMinutes) : undefined,
    priority: task.priority,
  });
  return { urgent, spoken, delayMinutes, templateMessage };
}

function buildAnnounce(
  type: AnnouncementType,
  task: Task,
  scheduledFor: Date,
  now: Date,
  prefs: VoicePreferences,
  quietActive: boolean,
): Decision {
  return {
    action: "announce",
    type,
    task,
    scheduledFor,
    ...announceFields(type, task, now, prefs, quietActive),
  };
}

// ─── Déduplication (e) ────────────────────────────────────────────────────────

type Resolution = "create" | "skip" | "retrigger";

/**
 * Résout un candidat contre le log existant (clé unique taskId+type+scheduledFor) :
 *  - aucun log → create ;
 *  - 'annonce' ou 'expire' → skip (JAMAIS rejouée) ;
 *  - 'reporte' snoozé futur → skip ; échu (≤ now) → retrigger (la tâche est
 *    nécessairement toujours en_cours : les décisions ne viennent que d'elle).
 */
export function resolveExisting(existing: ReminderLog | undefined, now: Date): Resolution {
  if (!existing) return "create";
  if (existing.status === "annonce" || existing.status === "expire") return "skip";
  if (existing.status === "reporte") {
    if (!existing.snoozedUntil) return "skip";
    return existing.snoozedUntil.getTime() <= now.getTime() ? "retrigger" : "skip";
  }
  return "skip";
}

// ─── Persistance (orchestration) ──────────────────────────────────────────────

/** Singleton VoicePreferences (id="default"), créé si absent. */
export async function getOrCreatePreferences(): Promise<VoicePreferences> {
  const existing = await db.voicePreferences.findUnique({ where: { id: "default" } });
  if (existing) return existing;
  try {
    return await db.voicePreferences.create({ data: { id: "default" } });
  } catch {
    // Course concurrente : le singleton existe déjà.
    const created = await db.voicePreferences.findUnique({ where: { id: "default" } });
    if (!created) throw new Error("Impossible de créer les préférences vocales");
    return created;
  }
}

interface PendingAnnouncement {
  decision: Decision;
  key: string;
  spoken: boolean;
  urgent: boolean;
  templateMessage: string;
  delayMinutes: number | null;
  existingLogId?: string;
  message: string;
  messageSource: "ia" | "template";
}

/**
 * Exécute un tick complet : charge → computeTick → résolution logs → LLM
 * (optionnel, style 'naturel', annonces parlées uniquement) → persistance.
 * Idempotent : 2 ticks consécutifs ne produisent jamais deux fois la même annonce.
 */
export async function runTick(now: Date): Promise<TickResult> {
  const prefs = await getOrCreatePreferences();
  const tasks = await db.task.findMany();
  const activeIds = tasks.filter((t) => t.status === "en_cours").map((t) => t.id);

  // Logs pertinents : tous ceux des tâches actives (toutes dates, pour la dédup)
  // + tout log très récent (anti-frénésie, y compris tâches depuis supprimées/terminées).
  const recentLogs = await db.reminderLog.findMany({
    where: {
      OR: [
        { taskId: { in: activeIds } },
        { createdAt: { gte: new Date(now.getTime() - 2 * ANTI_FRENZY_MS) } },
      ],
    },
  });

  const { decisions, quietHours } = computeTick(now, prefs, tasks, recentLogs);

  // Mémoire anti-doublons locale (plusieurs décisions peuvent viser la même clé dans un tick).
  const logByKey = new Map<string, ReminderLog>();
  for (const log of recentLogs) logByKey.set(logKey(log.taskId, log.type, log.scheduledFor), log);

  const pending: PendingAnnouncement[] = [];

  for (const decision of decisions) {
    const key = logKey(decision.task.id, decision.type, decision.scheduledFor);
    const existing = logByKey.get(key);
    const resolution = resolveExisting(existing, now);

    if (resolution === "skip") continue;

    if (decision.action === "expire" && resolution === "create") {
      const log = await db.reminderLog.create({
        data: {
          taskId: decision.taskId,
          type: decision.type,
          scheduledFor: decision.scheduledFor,
          status: "expire",
        },
      });
      logByKey.set(key, log);
      continue;
    }

    // Annonce : décision 'announce', OU re-déclenchement d'un snooze échu —
    // même si la fenêtre d'origine est dépassée (le report explicite prime, spéc e).
    const fields =
      decision.action === "announce"
        ? decision
        : announceFields(decision.type, decision.task, now, prefs, quietHours.active);
    const spoken =
      resolution === "retrigger"
        ? computeSpoken(quietHours.active, fields.urgent, prefs.urgentOverrideQuiet)
        : fields.spoken;
    const delayMinutes =
      decision.action === "announce" ? decision.delayMinutes : delayForType(decision.type, decision.task, now);
    pending.push({
      decision,
      key,
      spoken,
      urgent: fields.urgent,
      templateMessage: fields.templateMessage,
      delayMinutes,
      existingLogId: resolution === "retrigger" && existing ? existing.id : undefined,
      message: fields.templateMessage,
      messageSource: "template",
    });
  }

  // (f) Reformulation LLM — décorative : style 'naturel' + annonces parlées uniquement.
  // Séquentielle (pas Promise.all) pour éviter les rafales → 429 rate-limit du LLM ;
  // chaque échec retombe de toute façon sur le template (ADR-002).
  // INTÉGRITÉ : le LLM ne reçoit QUE les faits que le template a le droit de citer —
  // en privacyMode, ni titre ni priorité (sinon l'IA pourrait les réinsérer).
  if (asStyle(prefs.style) === "naturel") {
    for (const p of pending) {
      if (!p.spoken) continue;
      const reformulated = await reformulate(p.templateMessage, {
        type: p.decision.type,
        title: prefs.privacyMode ? null : p.decision.task.title,
        delay: p.delayMinutes !== null ? formatDelay(p.delayMinutes) : null,
        priority: prefs.privacyMode ? null : p.decision.task.priority,
      });
      if (reformulated) {
        p.message = reformulated;
        p.messageSource = "ia";
      }
    }
  }

  // Persistance + contrat Announcement (log.id = clé anti-doublon client).
  const announcements: Announcement[] = [];
  for (const p of pending) {
    const { decision } = p;
    const logData = {
      status: p.spoken ? "annonce" : "expire",
      firedAt: p.spoken ? now : null,
      snoozedUntil: null,
      message: p.message,
      messageSource: p.messageSource,
    };
    const log = p.existingLogId
      ? await db.reminderLog.update({ where: { id: p.existingLogId }, data: logData })
      : await db.reminderLog.create({
          data: {
            taskId: decision.task.id,
            type: decision.type,
            scheduledFor: decision.scheduledFor,
            ...logData,
          },
        });
    logByKey.set(p.key, log);
    announcements.push({
      id: log.id,
      type: decision.type,
      taskId: decision.task.id,
      title: decision.task.title,
      message: p.message,
      messageSource: p.messageSource,
      priority: decision.task.priority,
      dueAt: decision.task.dueAt ? decision.task.dueAt.toISOString() : null,
      urgent: p.urgent,
      spoken: p.spoken,
    });
  }

  return { announcements, now, quietHours };
}
