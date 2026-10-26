# 📡 CONTRATS D'API (API-FIRST)

> **Dernière mise à jour** : 2026-10-26 (UTC, v1.2 — 429 + Retry-After documentés sur register/login, correction AUDIT-004 M3) · **RÈGLE** : aucun code frontend ne consomme un endpoint absent de ce fichier.

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

// VoicePreferences (par utilisateur — v1.1 FEATURE-AUTH ; le singleton "default" disparaît)
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

// AuthUser (v1.1 FEATURE-AUTH — contrat /api/auth/*)
{ id: string; email: string; name: string | null }

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
Auth: session
Response 200: { preferences: VoicePreferences }   # crée les préférences par défaut de l'utilisateur si absentes

PUT /api/voice-preferences
Auth: session
Request: VoicePreferences partiel (Zod, champs validés : volume 0..1, offsets 1..10080, style/enum, HH:mm regex)
Response 200: { preferences: VoicePreferences }
Erreurs: 400: { error }

GET /api/tasks?status=&category=
Auth: session
Response 200: { tasks: Task[] }   # TÂCHES DE L'UTILISATEUR CONNECTÉ ; tri : dueAt asc (nulls en dernier) puis createdAt desc
Erreurs: 400 | 401: { error }     # query invalide | session absente/expirée

POST /api/tasks
Auth: session
Request: { title: string(1..200); description?: string(0..2000); category?: string(0..50);
          priority?: enum; dueAt?: ISO | null; reminderOffsetMinutes?: number(1..10080) | null;
          reminderEnabled?: boolean }
Response 201: { task: Task }
Erreurs: 400: { error }

PATCH /api/tasks/[id]
Auth: session
Request: sous-ensemble des champs de Task (status ∈ en_cours|terminee|annulee ; title, description,
         category, priority, dueAt, reminderOffsetMinutes, reminderEnabled)
Response 200: { task: Task }      # status terminee/annulee => aucune annonce future (état dérivé)
Erreurs: 400 | 404: { error }

DELETE /api/tasks/[id]
Auth: session
Response 200: { ok: true }
Erreurs: 404: { error }

POST /api/assistant/tick
Description: cœur du ReminderScheduler — idempotent ; calcule les candidats DÉRIVÉS (reminder =
            dueAt−offset [fenêtre scheduledFor..+15 min], deadline = [dueAt..+15 min], new_task =
            createdAt ≤ 45 s + catégorie autorisée + anti-frénésie 1/60 s, priority = 1/jour/tâche
            pour haute+urgente) ; marque EXPIRE sans rattrapage les obsolètes (désactivé/silencieux/
            suspension) ; crée ReminderLog (unique taskId+type+scheduledFor) ⇒ anti-doublons (AC-008)
Auth: session
Request: { now?: string }          # ISO optionnel (défaut now serveur)
Response 200: { announcements: Announcement[]; now: string;
                quietHours: { active: boolean; window: string | null } }
Erreurs: 400: { error }

POST /api/assistant/snooze
Description: reporte une annonce (le log passe à "reporte", re-déclenché au tick quand échu, si
             la tâche est toujours en cours)
Auth: session
Request: { logId: string; minutes: number(1..1440) }
Response 200: { ok: true }
Erreurs: 400 | 401 | 404: { error }   # 404 = log inexistant OU appartenant à un autre utilisateur (indistinguable)

POST /api/assistant/test-voice
Description: message d'exemple (mêmes builders que la prod ; N'est PAS journalisé)
Auth: session
Request: { style?: "naturel"|"professionnel"|"bref"; type?: type d'annonce }
Response 200: { message: string; messageSource: "ia"|"template" }
Erreurs: 400: { error }
```

Règles transverses v1 : Zod partout · aucune donnée inventée par l'IA (template d'abord, ADR-002) ·
LLM = z-ai-web-dev-sdk **serveur uniquement** · erreurs uniformes `{ error }` · tick **idempotent**.

## ✅ Contrats v1.1 — FEATURE-AUTH « Authentification multi-utilisateurs » (Task 22 — AUTHORITATIF)

Session = cookie `devos_session` **httpOnly** (JWT HS256 `jose`, TTL 7 jours, secret `JWT_SECRET`)
posée par register/login. Mot de passe bcrypt (coût 10). **Aucun middleware** — contrôle d'accès
route par route (ADR-003). Tout endpoint métier (v1) exige la session → **401** `{ error: string }`
sinon ; le client traite tout 401 métier comme « session absente/expirée » (déconnexion locale).

```yaml
POST /api/auth/register
Description: création de compte + session immédiate (Set-Cookie)
Auth: none
Request: { email: string(3..254, trim/minuscules, format email); password: string(8..72); name?: string(1..80) }
Response 201: { user: AuthUser }
Erreurs: 400 | 409 (email déjà pris): { error } | 429 (rate limit 5/h/IP): { error } + header Retry-After

POST /api/auth/login
Description: connexion (Set-Cookie). Message d'échec GÉNÉRIQUE + égalisation temporelle bcrypt
Auth: none
Request: { email: string; password: string }
Response 200: { user: AuthUser }
Erreurs: 400 | 401: { error }     # 401 = "Email ou mot de passe incorrect." (jamais d'information sur l'existence du compte)
          | 429 (rate limit 10/15 min/IP): { error } + header Retry-After

POST /api/auth/logout
Description: suppression du cookie de session (idempotent)
Auth: none (fonctionne avec ou sans session)
Request: —
Response 200: { ok: true }
Erreurs: —

GET /api/auth/me
Description: profil de la session courante
Auth: session (lecture seule — renvoie 401 plutôt qu'un objet vide)
Request: —
Response 200: { user: AuthUser }
Erreurs: 401 | 500: { error }
```

Règles transverses v1.1 : scoping strict par `userId` côté serveur (tâches, préférences, logs via la
tâche, anti-frénésie) · accès croisé inter-utilisateurs = **404 générique** (jamais 403, sans
divulgation d'existence) · secret JWT jamais commité (`.env` hors git) · ADR-003 fait foi.

## ✅ Contrats v1.3 — FEATURE-UI-SHELL « Espace de travail » (Task 33 — AUTHORITATIF)

Règles transverses v1.3 : scoping strict `userId` (projets, notes, activité) · 404 générique
inter-utilisateurs · le projet référencé (`projectId`) doit appartenir à l'utilisateur → sinon 404 ·
scoping côté serveur uniquement · Task.projectId nullable (SetNull à la suppression d'un projet).

### GET /api/projects?status=
Description: liste des projets de l'utilisateur (compteurs tâches inclus)
Auth: session
Query: status? = actif|en_pause|termine|archive
Response 200: { projects: Project[] }  # tri favorite desc, updatedAt desc ; Project inclut taskCount + doneTaskCount
Erreurs: 400 | 401 | 500: { error }

### POST /api/projects
Description: création de projet
Auth: session
Request: { name: string(1..120); description?: string(0..2000); status?; priority?; favorite?; color?; dueAt?: ISO|null }
Response 201: { project: Project }
Erreurs: 400 | 401 | 500: { error }

### GET | PATCH | DELETE /api/projects/[id]
Description: détail / mise à jour partielle / suppression (tâches et notes détachées via SetNull)
Auth: session
PATCH Request: champs partiels du POST (name, description, status, priority, favorite, color, dueAt)
Response 200: { project: Project } | DELETE: { ok: true }
Erreurs: 400 | 401 | 404 (générique inter-users) | 500: { error }

### GET /api/notes?projectId=&trashed=
Description: liste des notes (toutes / corbeille / par projet) — include projectName
Auth: session
Response 200: { notes: Note[] }  # tri favorite desc, updatedAt desc
Erreurs: 400 | 401 | 500: { error }

### POST /api/notes
Description: création de note (association projet optionnelle vérifiée)
Auth: session
Request: { title: string(1..160); content?: string(0..50_000); projectId?: string|null; favorite?: boolean }
Response 201: { note: Note }
Erreurs: 400 | 401 | 404 (projet introuvable) | 500: { error }

### GET | PATCH | DELETE /api/notes/[id]
Description: détail / mise à jour partielle (title, content, favorite, trashed, projectId) / suppression définitive
Auth: session
Response 200: { note: Note } | DELETE: { ok: true }
Erreurs: 400 | 401 | 404 (générique inter-users) | 500: { error }

### GET /api/activity?limit=
Description: journal d'activité — ReminderLog des tâches de l'utilisateur (scopage via la tâche)
Auth: session
Query: limit? = 1..200 (défaut 100)
Response 200: { activity: ActivityEntry[] }  # ActivityEntry = ReminderLog + taskTitle, tri createdAt desc
Erreurs: 400 | 401 | 500: { error }

### POST /api/ai/chat
Description: Assistant IA conversationnel (SDK z-ai-web-dev-sdk — BACKEND uniquement)
Auth: session
Rate limit: 10 requêtes / 5 min / IP (429 + Retry-After, limiteur DEBT-021)
Request: { messages: { role: user|assistant; content: string(1..4000) }[1..20]; context?: general|dev|planification }
Response 200: { message: { role: "assistant"; content: string; at: ISO }; remaining: number|null }
Erreurs: 400 | 401 | 429 | 500 | 502: { error }
Sécurité: AUCUN accès outillé aux données en v1 (ROLES_PERMISSIONS.md §3) — seul un indice de
comptes (tâches en cours / projets actifs) est injecté côté serveur ; pas de contenu privé.

### Modification v1.1 → v1.3 des endpoints existants
- `POST /api/tasks` et `PATCH /api/tasks/[id]` : acceptent désormais `projectId?: string|null`
  (projet vérifié côté serveur) ; sérialisation Task enrichie de `projectId` + `projectName`.

## ✅ Contrats v1.4 — « Historique IA persistant + Automatisations » (Task 37 — AUTHORITATIF)

Règles transverses v1.4 : scoping strict `userId` (conversations IA, automatisations, runs) ·
404 générique inter-utilisateurs · suppression en cascade (user → conversations → messages ;
user → automatisations → runs) · messages IA : SDK **serveur uniquement** (inchangé) ·
rate limit chat inchangé (10/5 min/IP) · automatisations : messages **template uniquement**
v1 (aucune invention LLM — règle d'intégrité ADR-002) · horaires interprétés en **UTC**
(fuseau serveur Africa/Abidjan).

### GET /api/ai/conversations
Description: liste des conversations IA de l'utilisateur
Auth: session
Query: limit? = 1..50 (défaut 30)
Response 200: { conversations: AiConversationSummary[] }
  # AiConversationSummary = { id, title, context, messageCount, createdAt, updatedAt } — tri updatedAt desc
Erreurs: 400 | 401 | 500: { error }

### POST /api/ai/conversations
Description: création d'une conversation vide
Auth: session
Request: { title?: string(1..160); context?: general|dev|planification }
Response 201: { conversation: AiConversationSummary }
Erreurs: 400 | 401 | 500: { error }

### GET /api/ai/conversations/[id]
Description: détail d'une conversation + messages (tri createdAt asc, tous)
Auth: session
Response 200: { conversation: AiConversationSummary; messages: { id; role: user|assistant; content; createdAt: ISO }[] }
Erreurs: 400 | 401 | 404 (générique inter-users) | 500: { error }

### PATCH /api/ai/conversations/[id]
Description: renommage
Auth: session
Request: { title: string(1..160) }
Response 200: { conversation: AiConversationSummary }
Erreurs: 400 | 401 | 404 | 500: { error }

### DELETE /api/ai/conversations/[id]
Description: suppression (messages en cascade)
Auth: session
Response 200: { ok: true }
Erreurs: 401 | 404 | 500: { error }

### POST /api/ai/chat  *(v1.3 → v1.4 : extension additive)*
Description: Assistant IA — **persistance automatique** dans une conversation
Auth: session
Rate limit: 10 requêtes / 5 min / IP (inchangé)
Request: { messages: { role; content }[1..20]; context?: general|dev|planification;
           conversationId?: string }
  # conversationId absent → conversation créée implicitement (titre auto = 1ᵉʳ message user tronqué 60)
  # conversationId fourni → doit appartenir à l'utilisateur (sinon 404) ; seuls le DERNIER
  # message user fourni et la réponse sont persistés (les précédents sont déjà en base)
Response 200: { message: { role: "assistant"; content; at }; remaining: number|null;
                conversationId: string }   # + champ conversationId (NOUVEAU)
Erreurs: 400 | 401 | 404 | 429 | 500 | 502: { error }
Intégrité: aucun accès outillé aux données (inchangé) ; le contexte système reste un indice
de comptes ; l'historique persisté n'est JAMAIS réinjecté au LLM au-delà des messages fournis
par le client (cap 20 conservé).

### GET /api/automations
Description: liste des automatisations de l'utilisateur
Auth: session
Response 200: { automations: Automation[] }
  # Automation = { id, name, enabled, triggerType: schedule|condition, scheduleTime: "HH:MM"|null,
  #   scheduleDays: "0..6 CSV", conditionType: "overdue_count"|null, threshold: number|null,
  #   message: string|null, lastRunAt: ISO|null, createdAt, updatedAt } — tri updatedAt desc
Erreurs: 401 | 500: { error }

### POST /api/automations
Description: création d'une automatisation (validation croisée selon triggerType)
Auth: session
Request: { name: string(1..80); triggerType: "schedule"|"condition";
           scheduleTime?: "^([01]\d|2[0-3]):[0-5]\d$" (requis si schedule);
           scheduleDays?: CSV jours 0..6 (0=dimanche, défaut "1,2,3,4,5");
           conditionType?: "overdue_count" (requis si condition);
           threshold?: int 1..99 (requis si condition);
           message?: string(0..500) (schedule uniquement, optionnel) }
Response 201: { automation: Automation }
Erreurs: 400 | 401 | 500: { error }

### GET | PATCH | DELETE /api/automations/[id]
Description: détail (+ 10 derniers runs) / mise à jour partielle (toggle enabled, renommage,
             modification du déclencheur) / suppression (runs en cascade)
Auth: session
Response 200: { automation: Automation; runs: AutomationRun[] } | PATCH: { automation: Automation } | DELETE: { ok: true }
  # AutomationRun = { id, trigger: schedule|condition|manuel, scheduledFor, status: annonce|expire,
  #   firedAt: ISO|null, message: string|null, messageSource, createdAt }
Erreurs: 400 | 401 | 404 (générique inter-users) | 500: { error }

### POST /api/automations/[id]/run
Description: exécution manuelle immédiate (trigger "manuel") — génère l'annonce template,
             crée un run (idempotent à la seconde, 409 si double-clic < 1 s) et met à jour lastRunAt
Auth: session
Request: —
Response 200: { run: AutomationRun }
Erreurs: 401 | 404 | 409 (run < 1 s) | 500: { error }

### Modification v1.3 → v1.4 des endpoints existants
- `POST /api/assistant/tick` : évalue AUSSI les automatisations actives de l'utilisateur
  (module `evaluateAutomations`, après le scheduler ADR-002 — cœur du tick inchangé) ;
  les annonces d'automatisation apparaissent dans `announcements[]` avec
  `type: "automation"`, `taskId: null`, `title` = nom de l'automatisation.
- `AnnouncementType` étendu : `"reminder" | "new_task" | "deadline" | "priority" | "automation"`.

## 🗄️ Contrats archivés

### `GET /api` — Endpoint de santé démo scaffold → **remplacé par `GET /api/health`** (DEBT-002, 2026-10-25)


## Journal des modifications
- 2026-10-25 : Création ; recensement de l'unique endpoint existant (`GET /api`).
- 2026-10-25 : v1 FEATURE-001 (7 endpoints) ; v1.1 FEATURE-AUTH (Task 22) — 4 endpoints auth + passage des 9 endpoints métier en `Auth: session` + types AuthUser/scopage (ADR-003).
- 2026-10-26 : v1.2 (AUDIT-004 M3) — 429 + Retry-After documentés sur register/login.
- 2026-10-26 : v1.3 FEATURE-UI-SHELL (Task 33) — 6 nouveaux endpoints (projects, notes, activity, ai/chat) + projectId sur tasks ; types Project/Note/ActivityEntry/AiChatResponse (ADR-004).
- 2026-10-26 : v1.4 « Historique IA persistant + Automatisations » (Task 37) — 5 endpoints conversations + 4 endpoints automations (dont run manuel) + chat persistant (conversationId) + tick étendu aux automatisations (type "automation") ; vues ui-shell : historique IA + vue Automatisations ACTIVE (registre planned→active).
