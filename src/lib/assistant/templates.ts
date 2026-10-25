/**
 * templates.ts — builders de messages FR pour l'assistant vocal (ADR-002).
 *
 * RÈGLE D'INTÉGRITÉ PRODUIT : un template ne produit JAMAIS de donnée hors des
 * faits passés en paramètre (titre, délai, priorité). Pas de lecture de
 * description, pas d'invention. Le LLM (ai.ts) ne fait que reformuler ce
 * message, avec fallback systématique sur le template.
 */

export type AnnouncementType = "reminder" | "new_task" | "deadline" | "priority";
export type AssistantStyle = "naturel" | "professionnel" | "bref";

export interface TemplateFacts {
  /** Titre exact de la tâche (omis si privacyMode). */
  title?: string;
  /** Durée humanisée SANS préposition : « 45 minutes », « 1 heure », « maintenant ». */
  delayText?: string;
  /** Priorité brute de la tâche (ex. « urgente ») — jamais citée verbatim dans le message. */
  priority?: string;
}

/**
 * Humanise un délai en minutes → durée FR sans préposition.
 * 0/négatif → « maintenant » · 45 → « 45 minutes » · 60 → « 1 heure »
 * 90 → « 1 heure et 30 minutes » · 1440 → « 1 jour » · 1620 → « 1 jour et 3 heures »
 */
export function humanizeDelay(minutes: number): string {
  if (!Number.isFinite(minutes)) return "maintenant";
  const m = Math.round(minutes);
  if (m <= 0) return "maintenant";
  if (m === 1) return "1 minute";
  if (m < 60) return `${m} minutes`;
  const hours = Math.floor(m / 60);
  const restM = m % 60;
  if (m < 1440) {
    const h = hours === 1 ? "1 heure" : `${hours} heures`;
    return restM > 0 ? `${h} et ${restM} minutes` : h;
  }
  const days = Math.floor(m / 1440);
  const restH = m % 1440;
  const d = days === 1 ? "1 jour" : `${days} jours`;
  if (restH === 0) return d;
  const rh = Math.floor(restH / 60);
  const rhTxt = rh === 1 ? "1 heure" : `${rh} heures`;
  return restH % 60 === 0 ? `${d} et ${rhTxt}` : `${d} et ${rhTxt} (environ)`;
}

/** Prépositionnel : « dans 45 minutes », « maintenant ». */
export function formatDelay(minutes: number): string {
  const txt = humanizeDelay(minutes);
  return txt === "maintenant" ? "maintenant" : `dans ${txt}`;
}

function hasDelay(facts: TemplateFacts): boolean {
  return Boolean(facts.delayText) && facts.delayText !== "maintenant";
}

/**
 * Construit le message template pour (type × style × privacyMode).
 * privacyMode=true → message générique SANS titre (aucune fuite d'information).
 */
export function buildTemplateMessage(
  type: AnnouncementType,
  style: AssistantStyle,
  privacyMode: boolean,
  facts: TemplateFacts,
): string {
  if (privacyMode) return buildPrivacyMessage(type, style, facts);
  const title = facts.title?.trim() || "ta tâche";
  const d = hasDelay(facts) ? `dans ${facts.delayText}` : "maintenant";

  switch (type) {
    case "reminder":
      switch (style) {
        case "naturel":
          return hasDelay(facts)
            ? `Bonjour ! Dans ${facts.delayText}, tu as prévu : ${title}.`
            : `Bonjour ! C'est le moment : tu as prévu ${title}.`;
        case "professionnel":
          return `Rappel : ${title} est prévu ${d}.`;
        case "bref":
          return hasDelay(facts) ? `Dans ${facts.delayText} : ${title}.` : `Maintenant : ${title}.`;
      }
      break;
    case "deadline":
      switch (style) {
        case "naturel":
          return `C'est le moment : ${title} arrive à échéance.`;
        case "professionnel":
          return `Échéance atteinte : ${title} arrive à terme.`;
        case "bref":
          return `Échéance : ${title}.`;
      }
      break;
    case "new_task":
      switch (style) {
        case "naturel":
          return `Une nouvelle tâche a été ajoutée : ${title}.`;
        case "professionnel":
          return `Nouvelle tâche enregistrée : ${title}.`;
        case "bref":
          return `Nouvelle tâche : ${title}.`;
      }
      break;
    case "priority":
      switch (style) {
        case "naturel":
          return `Petit rappel : ${title} est prioritaire aujourd'hui.`;
        case "professionnel":
          return `Rappel : ${title} est une priorité du jour.`;
        case "bref":
          return `Priorité du jour : ${title}.`;
      }
      break;
  }
  // Garantie d'exhaustivité (tous les cas ci-dessus sont couverts).
  return title;
}

/** Messages génériques (mode discret) — AUCUN titre, aucune donnée sensible. */
function buildPrivacyMessage(type: AnnouncementType, style: AssistantStyle, facts: TemplateFacts): string {
  const d = hasDelay(facts) ? `dans ${facts.delayText}` : "";
  switch (type) {
    case "reminder":
      switch (style) {
        case "naturel":
          return hasDelay(facts)
            ? `Bonjour ! Tu as quelque chose de prévu ${d}.`
            : "Bonjour ! Tu as quelque chose de prévu maintenant.";
        case "professionnel":
          return `Rappel : une échéance est prévue ${d || "maintenant"}.`;
        case "bref":
          return hasDelay(facts) ? `Rappel ${d}.` : "Rappel immédiat.";
      }
      break;
    case "deadline":
      switch (style) {
        case "naturel":
          return d ? `Une échéance approche ${d}.` : "Une échéance approche.";
        case "professionnel":
          return d ? `Une échéance arrive à terme ${d}.` : "Une échéance arrive à terme.";
        case "bref":
          return d ? `Échéance ${d}.` : "Échéance imminente.";
      }
      break;
    case "new_task":
      switch (style) {
        case "naturel":
          return "Une nouvelle tâche attend ton attention.";
        case "professionnel":
          return "Une nouvelle tâche a été enregistrée.";
        case "bref":
          return "Nouvelle tâche reçue.";
      }
      break;
    case "priority":
      switch (style) {
        case "naturel":
          return "Une tâche prioritaire attend ton attention aujourd'hui.";
        case "professionnel":
          return "Une tâche prioritaire est à traiter aujourd'hui.";
        case "bref":
          return "Priorité du jour à traiter.";
      }
      break;
  }
  return "Rappel de l'assistant.";
}
