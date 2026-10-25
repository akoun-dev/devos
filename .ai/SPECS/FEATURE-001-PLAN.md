# 🎯 FEATURE-001 — PLAN DE RÉPARTITION PAR AGENT
## DevOS — Assistant vocal proactif et rappels intelligents

> **Créé** : 2026-10-25 (UTC) · **Responsable** : ORCHESTRATEUR PRINCIPAL (CTO)
> **Source** : `.ai/REQUIREMENTS.md` (FR-001→010, AC-001→012, 7 jalons) · **Epic** : TASK-006
> **Statut** : 📋 PLAN OFFICIEL — exécution verrouillée jusqu'au signal « GO »

---

## 1. Rappel du produit et des règles d'or

- **Produit** : assistant vocal qui annonce proactivement nouvelles tâches / échéances / priorités, avec écran Paramètres→Assistant vocal, heures silencieuses, style naturel, rappels fiables.
- **Règle d'intégrité #1** : l'IA reformule, ne modifie JAMAIS les données (priorité, échéance, statut). Fiabilité des rappels > génération IA.
- **Règle d'intégrité #2 (plateforme)** : la cible déclarée est Flutter/Dart/Drift/Supabase/Gemma ; le sandbox est Next.js 16. Les écarts sont documentés dans REQUIREMENTS.md §5 et ADR-001 — **aucune simulation trompeuse** (arrière-plan Android/Linux = non réalisable ici, documenté seulement).
- **AC-012 (critique)** : le planificateur est INDÉPENDANT de l'IA — rappels déclenchés avec messages préparés même si le LLM est indisponible.

## 2. Séquence d'exécution (au signal GO) — IDs globaux

| Task ID | Phase lifecycle | Mission | Agent(s) responsable(s) | Exigences couvertes | Dépendances |
|---|---|---|---|---|---|
| **10-a** | Phase 0 — UX Design | Parcours utilisateur écran « Paramètres → Assistant vocal » (wireframe 9 réglages + bouton Test voix + Suspendre), scénarios de flux (1ʳᵉ activation, permission notifications, heure silencieuse, tâche modifiée/annulée) | **AGENT UX/UI** | FR-006, FR-010, AC-005, AC-010 | GO |
| **10-b** | Phase 2 — Design technique (∥ 10-a) | Rédaction **ADR-001** (adaptation plateforme sandbox↔Flutter) + **ADR-002** (scheduler indépendant de l'IA), modèle de données, diagramme des 8 composants adaptés, contrats API v1 | **AGENT 1 (Tech Lead)** | FR-008, FR-009, AC-006, AC-012 | GO |
| **11** | Phase 3 — Découpage | Éclatement M1→M7 en sous-tâches dans TASKS.xlsx (19 colonnes) + estimation + owners ; validation contrat API avant tout frontend | **AGENT 2 (QA/PO)** | Tous | 10-a + 10-b |
| **12-a** | Phase 4 — M1 Backend | Schéma Prisma (VoicePreferences, Task, ReminderLog…) + API REST préférences + persistance locale/offline (localStorage + serveur) | **AGENT BACKEND** | FR-006, AC-005 | 11 |
| **12-b** | Phase 4 — M1 Frontend (après contrat API) | UI Paramètres→Assistant vocal (Switch, Select délais, heures silencieuses début/fin/jours, style, voix/langue, volume, catégories, confidentialité, « Tester la voix », « Suspendre les annonces ») | **AGENT FRONTEND** | FR-006, AC-005 | 11 + 12-a + 10-a |
| **13-a** | Phase 4 — M2 Scheduler | `ReminderScheduler` : tick planifié, délai global + par tâche, recalcul sur modification/terminaison/annulation (AC-007), anti-doublons persistants (AC-008), fuseau Africa/Abidjan | **AGENT BACKEND** | FR-001, FR-003, AC-002, AC-007, AC-008 | 12-a |
| **13-b** | Phase 4 — M2 Notifications | `NotificationService` (Web Notifications API, `requestPermission()` explicite + écran d'explication, actions reporter/ouvrir tâche) | **AGENT FRONTEND** | FR-001, FR-010, AC-010 | 11 + 10-a |
| **14** | Phase 4 — M3 TTS | Abstraction `TextToSpeechProvider` + implémentation Web Speech API (voix locales, offline), messages préparés multistyles (naturel/pro/bref), volume, langue | **AGENT FRONTEND** (+ BACKEND pour endpoint test) | FR-005, AC-004, AC-006 | 12-a |
| **15** | Phase 4 — M4 Détection | `EventListener` : création/modification/annulation de tâche, échéances, priorités (données DevOS uniquement) ; catégories autorisées ; anti-frénésie | **AGENT BACKEND** | FR-002, FR-003, FR-004, AC-003 | 13-a |
| **16** | Phase 4 — M5 Silencieux & doublons | Heures silencieuses (plage + jours), reports intelligents, **pas de rafale de rattrapage en fin de plage**, alertes urgentes sur opt-in explicite uniquement ; test exhaustif anti-doublons | **AGENT BACKEND** + **AGENT 2** | FR-007, AC-008, AC-009 | 13-a + 15 |
| **17** | Phase 4 — M6 Intégration IA | `AIOrchestrator` côté serveur (z-ai-web-dev-sdk LLM) : reformulation conversationnelle ; **fallback templates systématique** (AC-012) ; garde-fous : jamais de donnée inventée, masquage infos sensibles | **AGENT BACKEND** + **AGENT SÉCURITÉ** | FR-004, FR-005, FR-010, AC-004, AC-012 | 14 + 15 |
| **18** | Phase 4 — M7 Sync & plateforme | `SyncIntegration` simulée (recalcul post-sync) + ADR cible Android (WorkManager/AlarmManager) & Linux (service systemd) — **documentation honnête, hors sandbox** | **AGENT 1** + **AGENT DOC** | FR-008, AC-011 (N/A justifié) | 13-a |
| **19** | Phase 5 — Revue & tests | Gherkin AC-001→012, revue de code croisée, audit sécurité (permissions, TTS, confidentialité vocale), a11y (WCAG 2.1 AA sur l'écran réglages), perf (budget) | **AGENT 2 (QA)** + **REVIEWER** + **SÉCURITÉ** + **A11Y** + **PERF** | Tous AC | 12→18 |
| **20** | Phase 6 — Vérif & doc | E2E navigateur (Agent Browser : réglages persistés, test voix, rappel simulé, heure silencieuse, LLM coupé→rappel fonctionne), doc utilisateur + CHANGELOG, journaux | **AGENT 2** + **AGENT DOC** + **AGENT 1** | AC-005, AC-008, AC-009, AC-012 | 19 |
| **21** | Phase 7 — Audit & rétro | **AUDIT-002** (seuil PROD ≥ 60/100 + dette Bootstrap traitée : headers sécurité, tests, ESLint), rétrospective, LESSONS_LEARNED | **AGENT AUDIT GLOBAL** + orchestrateur | — | 20 |

> **Parallélisme** : 10-a ∥ 10-b ; puis 12-a précède 12-b ; 13-b ∥ 13-a ; 14 ∥ 15 possibles après 12-a.
> **Loi des arrêts** : aucune tâche TERMINÉE sans commits conventionnels + revue positive (+ a11y/perf pour le frontend) ; aucune livraison PROD sans AUDIT-002 ≥ 60.

## 3. Couverture des 7 jalons CTO (spec §10) ↔ Task IDs

| Jalon CTO | Task IDs | Agent principal |
|---|---|---|
| ① Paramètres et préférences vocales | 12-a, 12-b | Backend → Frontend |
| ② Notifications et planification locale | 13-a, 13-b | Backend / Frontend |
| ③ Synthèse vocale et messages prédéfinis | 14 | Frontend |
| ④ Détection tâches/échéances/priorités | 15 | Backend |
| ⑤ Heures silencieuses et doublons | 16 | Backend + QA |
| ⑥ Intégration IA conversationnelle | 17 | Backend + Sécurité |
| ⑦ Sync + arrière-plan (cible documentée) | 18 | Tech Lead + Doc |

## 4. Rôle transversal de chaque agent permanent

- **Orchestrateur (CTO virtuel)** : séquencement, arbitrage, handoffs, respect verrous, validation des livraisons.
- **AGENT 1 (Tech Lead)** : architecture, ADR, contrats API, revues d'implémentation critiques.
- **AGENT 2 (QA/PO)** : Gherkin, traceabilité exigences↔tests, TASKS.xlsx source de vérité, E2E.
- **AGENT BACKEND** : Prisma, API routes, scheduler, détection, IA serveur.
- **AGENT FRONTEND** : UI shadcn, TTS client, notifications, responsive, footer sticky.
- **AGENT SÉCURITÉ** : permissions, confidentialité vocale, prompt-injection sur formulations IA, headers.
- **AGENT A11Y / PERF** : WCAG 2.1 AA, budgets PERFORMANCE_BUDGET.md.
- **AGENT COMMIT** : commits conventionnels atomiques, COMMIT_LOG.
- **AGENT REVIEWER** : revue systématique avant statut TERMINÉ.
- **AGENT DOC** : documentation, ADR rédactionnels, CHANGELOG.
- **AGENT AUDIT GLOBAL** : AUDIT-002, DEBT_REPORT, verdict PROD.

## 5. Risques suivis dès maintenant

| Risque | Mitigation | Owner |
|---|---|---|
| Dérive IA (données inventées) | LLM = reformulation seule + fallback templates + tests dédiés | Sécurité + Backend |
| Doublons de rappels | ReminderLog persistant + idempotence tick | Backend |
| Rafale post-heure silencieuse | Politique « obsolète = annulé » testée | Backend + QA |
| Fausse promesse arrière-plan | ADR-001 honnête, tests marqués N/A justifiés | Tech Lead |
| Dette Bootstrap (DEBT-001→015) | Traitement embarqué à AUDIT-002 (Task 21) | Audit |
