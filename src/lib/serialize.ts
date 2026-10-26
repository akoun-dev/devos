/**
 * serialize.ts — sérialisation stricte conforme aux contrats API :
 * dates → ISO 8601 et aucun champ interne inattendu.
 */

import type {
  AiConversation,
  AiMessage,
  Automation,
  AutomationRun,
  Note,
  Project,
  ReminderLog,
  Task,
  VoicePreferences,
} from "@prisma/client";

export function serializeTask(task: Task & { project?: { name: string } | null }) {
  return {
    id: task.id, title: task.title, description: task.description, category: task.category,
    priority: task.priority, status: task.status, dueAt: task.dueAt ? task.dueAt.toISOString() : null,
    reminderOffsetMinutes: task.reminderOffsetMinutes, reminderEnabled: task.reminderEnabled,
    projectId: task.projectId, projectName: task.project?.name ?? null,
    createdAt: task.createdAt.toISOString(), updatedAt: task.updatedAt.toISOString(),
  };
}

export function serializeProject(project: Project & { _count?: { tasks: number } }, doneTaskCount = 0) {
  return {
    id: project.id, name: project.name, description: project.description, status: project.status,
    priority: project.priority, favorite: project.favorite, color: project.color,
    dueAt: project.dueAt ? project.dueAt.toISOString() : null,
    sourceProvider: project.sourceProvider ?? null,
    sourceRepositoryId: project.sourceRepositoryId ?? null,
    sourceRepositoryUrl: project.sourceRepositoryUrl ?? null,
    sourceDefaultBranch: project.sourceDefaultBranch ?? null,
    taskCount: project._count?.tasks ?? 0, doneTaskCount,
    createdAt: project.createdAt.toISOString(), updatedAt: project.updatedAt.toISOString(),
  };
}

export function serializeNote(note: Note & { project?: { name: string } | null }) {
  return {
    id: note.id, title: note.title, content: note.content, favorite: note.favorite,
    trashed: note.trashed, projectId: note.projectId, projectName: note.project?.name ?? null,
    createdAt: note.createdAt.toISOString(), updatedAt: note.updatedAt.toISOString(),
  };
}

export function serializePreferences(prefs: VoicePreferences) {
  return {
    enabled: prefs.enabled, reminderOffsetMinutes: prefs.reminderOffsetMinutes,
    announceNewTasks: prefs.announceNewTasks, announceDeadlines: prefs.announceDeadlines,
    announcePriorities: prefs.announcePriorities, quietHoursEnabled: prefs.quietHoursEnabled,
    quietStart: prefs.quietStart, quietEnd: prefs.quietEnd, quietDays: prefs.quietDays,
    style: prefs.style, language: prefs.language, voice: prefs.voice, volume: prefs.volume,
    allowedCategories: prefs.allowedCategories, privacyMode: prefs.privacyMode,
    urgentOverrideQuiet: prefs.urgentOverrideQuiet, suspended: prefs.suspended,
    suspendedUntil: prefs.suspendedUntil ? prefs.suspendedUntil.toISOString() : null,
    updatedAt: prefs.updatedAt.toISOString(),
  };
}

export function serializeLog(log: ReminderLog) {
  return {
    id: log.id, taskId: log.taskId, type: log.type, scheduledFor: log.scheduledFor.toISOString(),
    status: log.status, firedAt: log.firedAt ? log.firedAt.toISOString() : null,
    snoozedUntil: log.snoozedUntil ? log.snoozedUntil.toISOString() : null,
    message: log.message, messageSource: log.messageSource, createdAt: log.createdAt.toISOString(),
  };
}

// ─── Contrat v1.4 — conversations IA ─────────────────────────────────────────

export function serializeAiConversation(
  conversation: AiConversation & { _count?: { messages: number } },
) {
  return {
    id: conversation.id,
    title: conversation.title,
    context: conversation.context,
    messageCount: conversation._count?.messages ?? 0,
    createdAt: conversation.createdAt.toISOString(),
    updatedAt: conversation.updatedAt.toISOString(),
  };
}

export function serializeAiMessage(message: AiMessage) {
  return {
    id: message.id,
    role: message.role,
    content: message.content,
    createdAt: message.createdAt.toISOString(),
  };
}

// ─── Contrat v1.4 — automatisations ──────────────────────────────────────────

export function serializeAutomation(automation: Automation) {
  return {
    id: automation.id,
    name: automation.name,
    enabled: automation.enabled,
    triggerType: automation.triggerType,
    scheduleTime: automation.scheduleTime,
    scheduleDays: automation.scheduleDays,
    conditionType: automation.conditionType,
    threshold: automation.threshold,
    message: automation.message,
    lastRunAt: automation.lastRunAt ? automation.lastRunAt.toISOString() : null,
    createdAt: automation.createdAt.toISOString(),
    updatedAt: automation.updatedAt.toISOString(),
  };
}

export function serializeAutomationRun(run: AutomationRun) {
  return {
    id: run.id,
    trigger: run.trigger,
    scheduledFor: run.scheduledFor.toISOString(),
    status: run.status,
    firedAt: run.firedAt ? run.firedAt.toISOString() : null,
    message: run.message,
    messageSource: run.messageSource,
    createdAt: run.createdAt.toISOString(),
  };
}
