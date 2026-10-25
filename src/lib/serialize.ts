/**
 * serialize.ts — sérialisation stricte conforme au contrat API v1
 * (.ai/API_CONTRACTS.md) : dates → ISO 8601, EXACTEMENT les champs du contrat,
 * aucun champ en trop.
 */

import type { ReminderLog, Task, VoicePreferences } from "@prisma/client";

export function serializeTask(task: Task) {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    category: task.category,
    priority: task.priority,
    status: task.status,
    dueAt: task.dueAt ? task.dueAt.toISOString() : null,
    reminderOffsetMinutes: task.reminderOffsetMinutes,
    reminderEnabled: task.reminderEnabled,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  };
}

export function serializePreferences(prefs: VoicePreferences) {
  return {
    enabled: prefs.enabled,
    reminderOffsetMinutes: prefs.reminderOffsetMinutes,
    announceNewTasks: prefs.announceNewTasks,
    announceDeadlines: prefs.announceDeadlines,
    announcePriorities: prefs.announcePriorities,
    quietHoursEnabled: prefs.quietHoursEnabled,
    quietStart: prefs.quietStart,
    quietEnd: prefs.quietEnd,
    quietDays: prefs.quietDays,
    style: prefs.style,
    language: prefs.language,
    voice: prefs.voice,
    volume: prefs.volume,
    allowedCategories: prefs.allowedCategories,
    privacyMode: prefs.privacyMode,
    urgentOverrideQuiet: prefs.urgentOverrideQuiet,
    suspended: prefs.suspended,
    suspendedUntil: prefs.suspendedUntil ? prefs.suspendedUntil.toISOString() : null,
    updatedAt: prefs.updatedAt.toISOString(),
  };
}

/** Log sérialisé pour l'endpoint snooze / debug éventuel. */
export function serializeLog(log: ReminderLog) {
  return {
    id: log.id,
    taskId: log.taskId,
    type: log.type,
    scheduledFor: log.scheduledFor.toISOString(),
    status: log.status,
    firedAt: log.firedAt ? log.firedAt.toISOString() : null,
    snoozedUntil: log.snoozedUntil ? log.snoozedUntil.toISOString() : null,
    message: log.message,
    messageSource: log.messageSource,
    createdAt: log.createdAt.toISOString(),
  };
}
