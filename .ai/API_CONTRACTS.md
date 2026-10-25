# 📡 CONTRATS D'API (API-FIRST)

> **Dernière mise à jour** : 2026-10-25 (UTC) · **RÈGLE** : aucun code frontend ne consomme un endpoint absent de ce fichier.

## Format de contrat obligatoire

```yaml
[METHOD] /api/<route>
Description: <rôle fonctionnel>
Auth: <none | session | role:X>
Request:
  <DTO d'entrée validé par Zod — champs, types, contraintes>
Response 200:
  <DTO de sortie>
Erreurs:
  400: { error: string }  # payload invalide
  401 | 403 | 404 | 500: { error: string }
```

---

## ✅ Contrats en production

### `GET /api` — Endpoint de santé (démo scaffold)
- **Description** : ping applicatif.
- **Auth** : none
- **Request** : —
- **Response 200** : `{ "message": "string" }` → actuellement `"Hello, world!"`
- **Erreurs** : —
- **Implémentation** : `src/app/api/route.ts`
- **Note Audit** : endpoint scaffold sans valeur métier — à remplacer par `/api/health` structuré lors de la 1ère feature (cf. DEBT-002).

---

## 📝 Contrats en cours de conception

### v1 — FEATURE-001 « Assistant vocal proactif » (validé par Tech Lead, Task 10-b — AUTHORITATIF pour backend ET frontend)

Types partagés (JSON, dates = ISO 8601, fuseau serveur = Africa/Abidjan/UTC+0) :

```ts
// Task
{ id: string; title: string; description: string | null;
  category: string;                          // ex. "general", "dev", "test"
  priority: "basse" | "normale" | "haute" | "urgente";
  status: "en_cours" | "terminee" | "annulee";
  dueAt: string | null;                      // ISO
  reminderOffsetMinutes: number | null;      // null => délai global
  reminderEnabled: boolean;
  createdAt: string; updatedAt: string }

// VoicePreferences (singleton id="default")
{ enabled: boolean; reminderOffsetMinutes: number;   // défaut 60
  announceNewTasks: boolean; announceDeadlines: boolean; announcePriorities: boolean;
  quietHoursEnabled: boolean; quietStart: string; quietEnd: string; // "HH:mm" ("22:00"/"07:00")
  quietDays: string;                                  // CSV 0..6 (0=dim), défaut tous
  style: "naturel" | "professionnel" | "bref";
  language: string;                                   // "fr-FR"
  voice: string | null;                               // nom de voix navigateur
  volume: number;                                     // 0..1
  allowedCategories: string;                          // CSV, "" = toutes
  privacyMode: boolean;                               // mode discret (pas de titre)
  urgentOverrideQuiet: boolean;                       // opt-in explicite
  suspended: boolean; suspendedUntil: string | null;
  updatedAt: string }

// Announcement (produit par tick — PRÊTE À PRONONCER)
{ id: string;            // ReminderLog id = clé anti-doublon client
  type: "reminder" | "new_task" | "deadline" | "priority";
  taskId: string | null; title: string;
  message: string;       // template ou reformulation IA — déjà style + privacy appliqués
  messageSource: "ia" | "template";
  priority: string; dueAt: string | null;
  urgent: boolean;       // priority=urgente (ou haute ? => urgente uniquement)
  spoken: boolean }      // false => supprimée par heures silencieuses/suspension : notification muette uniquement, JAMAIS rejouée
```

```yaml
GET /api/health
Description: sonde de santé (remplace GET /api démo — DEBT-002)
Auth: none
Response 200: { status: "ok", db: "ok", time: string, version: string }
Erreurs: 500: { error }

GET /api/voice-preferences
Auth: none
Response 200: { preferences: VoicePreferences }   # crée le singleton par défaut si absent

PUT /api/voice-preferences
Auth: none
Request: VoicePreferences partiel (Zod, champs validés : volume 0..1, offsets 1..10080, style/enum, HH:mm regex)
Response 200: { preferences: VoicePreferences }
Erreurs: 400: { error }

GET /api/tasks?status=&category=
Auth: none
Response 200: { tasks: Task[] }   # tri : dueAt asc (nulls en dernier) puis createdAt desc
Erreurs: 400: { error }           # query invalide

POST /api/tasks
Auth: none
Request: { title: string(1..200); description?: string(0..2000); category?: string(0..50);
          priority?: enum; dueAt?: ISO | null; reminderOffsetMinutes?: number(1..10080) | null;
          reminderEnabled?: boolean }
Response 201: { task: Task }
Erreurs: 400: { error }

PATCH /api/tasks/[id]
Auth: none
Request: sous-ensemble des champs de Task (status ∈ en_cours|terminee|annulee ; title, description,
         category, priority, dueAt, reminderOffsetMinutes, reminderEnabled)
Response 200: { task: Task }      # status terminee/annulee => aucune annonce future (état dérivé)
Erreurs: 400 | 404: { error }

DELETE /api/tasks/[id]
Auth: none
Response 200: { ok: true }
Erreurs: 404: { error }

POST /api/assistant/tick
Description: cœur du ReminderScheduler — idempotent ; calcule les candidats DÉRIVÉS (reminder =
            dueAt−offset [fenêtre scheduledFor..+15 min], deadline = [dueAt..+15 min], new_task =
            createdAt ≤ 45 s + catégorie autorisée + anti-frénésie 1/60 s, priority = 1/jour/tâche
            pour haute+urgente) ; marque EXPIRE sans rattrapage les obsolètes (désactivé/silencieux/
            suspension) ; crée ReminderLog (unique taskId+type+scheduledFor) ⇒ anti-doublons (AC-008)
Auth: none
Request: { now?: string }          # ISO optionnel (défaut now serveur)
Response 200: { announcements: Announcement[]; now: string;
                quietHours: { active: boolean; window: string | null } }
Erreurs: 400: { error }

POST /api/assistant/snooze
Description: reporte une annonce (le log passe à "reporte", re-déclenché au tick quand échu, si
             la tâche est toujours en cours)
Auth: none
Request: { logId: string; minutes: number(1..1440) }
Response 200: { ok: true }
Erreurs: 400 | 404: { error }

POST /api/assistant/test-voice
Description: message d'exemple (mêmes builders que la prod ; N'est PAS journalisé)
Auth: none
Request: { style?: "naturel"|"professionnel"|"bref"; type?: type d'annonce }
Response 200: { message: string; messageSource: "ia"|"template" }
Erreurs: 400: { error }
```

Règles transverses v1 : Zod partout · aucune donnée inventée par l'IA (template d'abord, ADR-002) ·
LLM = z-ai-web-dev-sdk **serveur uniquement** · erreurs uniformes `{ error }` · tick **idempotent**.

## 🗄️ Contrats archivés

### `GET /api` — Endpoint de santé démo scaffold → **remplacé par `GET /api/health`** (DEBT-002, 2026-10-25)


## Journal des modifications
- 2026-10-25 : Création ; recensement de l'unique endpoint existant (`GET /api`).
