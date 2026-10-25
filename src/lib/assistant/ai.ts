/**
 * ai.ts — reformulation LLM décorative (ADR-002).
 *
 * ⚠️ SERVEUR UNIQUEMENT : ce module ne doit JAMAIS être importé côté client.
 * L'IA n'est JAMAIS dans le chemin critique : `reformulate` reçoit un message
 * template déjà complet et ne fait que le reformuler. Tout échec, timeout ou
 * réponse inutilisable → null → l'appelant garde le template (messageSource
 * reste "template"). L'IA n'invente, n'ajoute et ne modifie JAMAIS une donnée.
 */

const SYSTEM_PROMPT =
  "Tu reformules un message d'assistant vocal. Interdiction d'inventer/ajouter/modifier " +
  "une information (titre, heure, priorité). Maximum 2 phrases courtes, ton conversationnel, " +
  "même langue (français). Réponds UNIQUEMENT par le message reformulé.";

const TIMEOUT_MS = 4000;
const MAX_LENGTH = 400;

export interface ReformulateFacts {
  type: string;
  /**
   * ⚠️ CONTRACT D'INTÉGRITÉ : ces faits sont les SEULES informations que le
   * message final a le droit de contenir. L'appelant ne doit JAMAIS passer un
   * fait que le template n'a pas le droit de citer (ex. titre/priorité en
   * privacyMode) — sinon la reformulation pourrait les réinsérer.
   */
  title?: string | null;
  /** Durée humanisée complète, ex. « dans 45 minutes ». */
  delay?: string | null;
  priority?: string | null;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("LLM timeout")), ms);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

/**
 * Tente de reformuler le message template via le LLM (z-ai-web-dev-sdk).
 * Retourne la reformulation, ou null pour TOUT échec (l'appelant garde le template).
 */
export async function reformulate(
  templateMessage: string,
  facts: ReformulateFacts,
): Promise<string | null> {
  try {
    // Import dynamique : le SDK ne doit jamais alourdir le bundle client.
    const { default: ZAI } = await import("z-ai-web-dev-sdk");
    const zai = await ZAI.create();

    const factLines: string[] = [`Type d'annonce : ${facts.type}`];
    if (facts.title) factLines.push(`Titre exact de la tâche : ${facts.title}`);
    if (facts.delay) factLines.push(`Délai : ${facts.delay}`);
    if (facts.priority) factLines.push(`Priorité : ${facts.priority}`);

    const completion = (await withTimeout(
      zai.chat.completions.create({
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content:
              `Message à reformuler : « ${templateMessage} »\n` +
              `Faits à respecter strictement :\n${factLines.join("\n")}`,
          },
        ],
        thinking: { type: "disabled" },
      }),
      TIMEOUT_MS,
    )) as
      | { choices?: Array<{ message?: { content?: unknown } }> }
      | null
      | undefined;

    const raw: unknown = completion?.choices?.[0]?.message?.content;
    if (typeof raw !== "string") return null;
    const text = raw.trim();
    // Garde-fous : vide, trop long (risque d'invention) → fallback template.
    if (text.length < 2 || text.length > MAX_LENGTH) return null;
    // Nettoyage : guillemets englobants éventuels.
    return text.replace(/^«\s*/, "").replace(/\s*»$/, "") || null;
  } catch {
    // ADR-002 : tout échec LLM = zéro impact (template conservé).
    return null;
  }
}
