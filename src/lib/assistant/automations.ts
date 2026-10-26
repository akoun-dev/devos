/**
 * automations.ts — évaluation des automatisations (FEATURE-AUTOMATIONS, contrat v1.4).
 *
 * INTÉGRATION ADR-002 : ce module s'exécute APRÈS runTick (cœur du ReminderScheduler
 * INCHANGÉ) et fusionne ses annonces dans la réponse du tick. Les automatisations
 * n'ont PAS de tâche associée (taskId: null) : la déduplication ne peut pas réutiliser
 * ReminderLog (@@unique(taskId,type,scheduledFor) — taskId null est distinct en SQLite),
 * d'où un registre dédié `AutomationRun` (@@unique(automationId, scheduledFor)).
 *
 * Règles produit :
 *  - messages TEMPLATE uniquement en v1 (aucune invention LLM) ;
 *  - jamais « urgent » → jamais de contournement des heures silencieuses
 *    (silencieux => run persisté en statut « expire », annonce non parlée) ;
 *  - idempotent entre ticks : 1 exécution/jour/slot (schedule) ou/jour (condition)
 *    garantie par la contrainte DB + résolution préalable ;
 *  - horaires interprétés en UTC (fuseau serveur Africa/Abidjan) — documenté contrat v1.4 ;
 *  - fenêtre de grâce 15 min (même sémantique que le scheduler reminder/deadline).
 */

import type { Automation, AutomationRun } from "@prisma/client";
import { db } from "@/lib/db";
import { startOfUtcDay, type Announcement } from "./scheduler";

const MINUTE_MS = 60_000;
const SCHEDULE_GRACE_MIN = 15; // slot aujourd'hui à HH:MM .. +15 min => éligible
const DAY_SET = new Set([0, 1, 2, 3, 4, 5, 6]);

export type AutomationTrigger = "schedule" | "condition";

// ─── Utilitaires purs ────────────────────────────────────────────────────────

/** "HH:MM" → {h, m} (format déjà validé par Zod côté routes ; défensif ici). */
export function parseHHMM(time: string): { h: number; m: number } | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time.trim());
  if (!match) return null;
  return { h: Number(match[1]), m: Number(match[2]) };
}

/** Slot UTC du jour courant à HH:MM. */
export function slotForToday(now: Date, time: string): Date | null {
  const parsed = parseHHMM(time);
  if (!parsed) return null;
  return new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      parsed.h,
      parsed.m,
      0,
      0,
    ),
  );
}

/** CSV "0..6" → ensemble de jours valides (0 = dimanche). */
export function daysFromCsv(csv: string): Set<number> {
  return new Set(
    csv
      .split(",")
      .map((part) => Number(part.trim()))
      .filter((day) => DAY_SET.has(day)),
  );
}

/** Tronque à la seconde (bucket du run manuel — idempotence double-clic < 1 s). */
function secondBucket(now: Date): Date {
  return new Date(Math.floor(now.getTime() / 1000) * 1000);
}

// ─── Messages template (aucune invention) ────────────────────────────────────

function buildAutomationMessage(
  automation: Automation,
  context: { now: Date; overdueCount: number | null },
): string {
  const custom = automation.message?.trim();
  if (automation.triggerType === "schedule") {
    if (custom) return custom;
    return `Automatisation « ${automation.name} » : il est ${automation.scheduleTime ?? "—"}.`;
  }
  const count = context.overdueCount ?? 0;
  return `Automatisation « ${automation.name} » : ${count} tâche${count > 1 ? "s" : ""} en retard (seuil : ${automation.threshold ?? 1}).`;
}

// ─── Exécution d'un run ──────────────────────────────────────────────────────

export interface AutomationRunResult {
  run: AutomationRun;
  announcement: Announcement;
}

export type AutomationOutcome =
  | { ok: true; result: AutomationRunResult }
  | { ok: false; reason: "duplicate" | "not_eligible" };

async function createRun(params: {
  automation: Automation;
  userId: string;
  trigger: AutomationTrigger | "manuel";
  scheduledFor: Date;
  message: string;
  spoken: boolean;
  now: Date;
}): Promise<AutomationOutcome> {
  const { automation, userId, trigger, scheduledFor, message, spoken, now } = params;
  try {
    const run = await db.automationRun.create({
      data: {
        automationId: automation.id,
        userId,
        trigger,
        scheduledFor,
        status: spoken ? "annonce" : "expire",
        firedAt: spoken ? now : null,
        message,
        messageSource: "template",
      },
    });
    await db.automation.update({
      where: { id: automation.id },
      data: { lastRunAt: now },
    });
    const announcement: Announcement = {
      id: run.id,
      type: "automation",
      taskId: null,
      title: automation.name,
      message,
      messageSource: "template",
      priority: "normale",
      dueAt: null,
      urgent: false,
      spoken,
    };
    return { ok: true, result: { run, announcement } };
  } catch (error) {
    // P2002 uniquement = un run existe déjà pour cette clé (automationId +
    // scheduledFor) : l'automatisation a déjà tourné pour ce slot → skip
    // silencieux (idempotence). Toute autre erreur DB est PROPAGÉE (pas de
    // masquage d'erreur sous "duplicate").
    const code = (error as { code?: string })?.code;
    if (code === "P2002") return { ok: false, reason: "duplicate" };
    throw error;
  }
}

/** Retourne le run existant pour la clé de dédup, sinon null. */
async function findExistingRun(automationId: string, scheduledFor: Date): Promise<AutomationRun | null> {
  return db.automationRun.findUnique({
    where: { automationId_scheduledFor: { automationId, scheduledFor } },
  });
}

// ─── Évaluation (tick) ───────────────────────────────────────────────────────

/** Compte les tâches en retard d'un utilisateur (statut en_cours, dueAt passée). */
export async function countOverdueTasks(userId: string, now: Date): Promise<number> {
  return db.task.count({ where: { userId, status: "en_cours", dueAt: { lt: now } } });
}

/**
 * Évalue TOUTES les automatisations ACTIVES d'un utilisateur pour ce tick.
 * Appelée par POST /api/assistant/tick APRÈS runTick (cœur ADR-002 inchangé).
 * Séquentielle (pas Promise.all) pour éviter les rafales d'écriture SQLite.
 */
export async function evaluateAutomations(
  now: Date,
  userId: string,
  quietActive: boolean,
): Promise<Announcement[]> {
  const automations = await db.automation.findMany({
    where: { userId, enabled: true },
    orderBy: { createdAt: "asc" },
  });
  if (automations.length === 0) return [];

  const spoken = !quietActive; // une automatisation n'est jamais urgente
  const announcements: Announcement[] = [];
  const todayDow = now.getUTCDay();

  for (const automation of automations) {
    if (automation.triggerType === "schedule") {
      const days = daysFromCsv(automation.scheduleDays);
      if (!days.has(todayDow)) continue;
      if (!automation.scheduleTime) continue;
      const slot = slotForToday(now, automation.scheduleTime);
      if (!slot) continue;
      const elapsed = now.getTime() - slot.getTime();
      if (elapsed < 0 || elapsed > SCHEDULE_GRACE_MIN * MINUTE_MS) continue;
      if (await findExistingRun(automation.id, slot)) continue;
      const message = buildAutomationMessage(automation, { now, overdueCount: null });
      const outcome = await createRun({
        automation,
        userId,
        trigger: "schedule",
        scheduledFor: slot,
        message,
        spoken,
        now,
      });
      if (outcome.ok) announcements.push(outcome.result.announcement);
    } else if (automation.triggerType === "condition" && automation.conditionType === "overdue_count") {
      const threshold = automation.threshold ?? 1;
      const overdueCount = await countOverdueTasks(userId, now);
      if (overdueCount < threshold) continue;
      const scheduledFor = startOfUtcDay(now); // 1 exécution/jour max
      if (await findExistingRun(automation.id, scheduledFor)) continue;
      const message = buildAutomationMessage(automation, { now, overdueCount });
      const outcome = await createRun({
        automation,
        userId,
        trigger: "condition",
        scheduledFor,
        message,
        spoken,
        now,
      });
      if (outcome.ok) announcements.push(outcome.result.announcement);
    }
  }

  return announcements;
}

// ─── Exécution manuelle ──────────────────────────────────────────────────────

/**
 * Exécution manuelle immédiate (POST /api/automations/[id]/run).
 * Scopage userId obligatoire. Idempotent à la seconde (double-clic → "duplicate").
 * Une automatisation désactivée reste testable manuellement (vérification explicite).
 */
export async function runAutomationManually(
  now: Date,
  userId: string,
  automationId: string,
): Promise<{ ok: true; result: AutomationRunResult } | { ok: false; reason: "not_found" | "duplicate" }> {
  const automation = await db.automation.findFirst({ where: { id: automationId, userId } });
  if (!automation) return { ok: false, reason: "not_found" };

  const scheduledFor = secondBucket(now);
  if (await findExistingRun(automation.id, scheduledFor)) {
    return { ok: false, reason: "duplicate" };
  }

  const overdueCount =
    automation.triggerType === "condition" && automation.conditionType === "overdue_count"
      ? await countOverdueTasks(userId, now)
      : null;
  const message = buildAutomationMessage(automation, { now, overdueCount });

  const outcome = await createRun({
    automation,
    userId,
    trigger: "manuel",
    scheduledFor,
    message,
    spoken: true, // exécution manuelle = volonté explicite de l'utilisateur
    now,
  });
  return outcome.ok ? outcome : { ok: false, reason: "duplicate" };
}
