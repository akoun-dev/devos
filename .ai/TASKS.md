# 📊 BACKLOG CENTRAL — Vue lisible (miroir de TASKS.xlsx)

> **Dernière mise à jour** : 2026-10-26 (UTC, FEATURE-UI-SHELL) · **Responsable** : AGENT 2 · **Source de vérité** : `.ai/TASKS.xlsx`

## Statistiques

| Statut | Nombre |
|---|---|
| ✅ Terminées | 19 |
| 🔄 En cours | 0 |
| ⏳ À faire | 0 |
| 🚫 Bloquées | 0 |
| **Total** | **19** |

**Progression moyenne : 100 %** · **Score santé projet : 80/100 (AUDIT-004)** — **AUDIT-005 en cours** après FEATURE-UI-SHELL (TASK-019) · **Dette : 22 items — 17 TRAITÉ · 2 EN COURS · 1 REPORTÉ · 1 ACCEPTÉE · 1 OUVERT (018)**

## Tâches

| ID | Epic | Fonctionnalité | Sous-tâche | Rôle | Statut | Progr. | Prio | Tests | Résultat |
|---|---|---|---|---|---|---|---|---|---|
| TASK-001 | BOOTSTRAP | Prise en charge du projet | Analyse complète du codebase | Tech Lead | ✅ TERMINÉ | 100% | P1 | Inspection manuelle | ✅ Constats dans PROJECT_CONTEXT.md |
| TASK-002 | BOOTSTRAP | Prise en charge du projet | Dossier de pilotage `.ai/` | Tech Lead + Doc | ✅ TERMINÉ | 100% | P1 | Présence fichiers | ✅ 37 fichiers |
| TASK-003 | BOOTSTRAP | Prise en charge du projet | TASKS.xlsx + worklog.md | QA (Agent 2) | ✅ TERMINÉ | 100% | P1 | Pipeline xlsx | ✅ validate passed |
| TASK-004 | BOOTSTRAP | Prise en charge du projet | AUDIT GLOBAL #001 (baseline) | Audit Global | ✅ TERMINÉ | 100% | P1 | Rapport AUDIT-001 | ✅ Score 70/100 · 0 CRITIQUE |
| TASK-005 | PRODUIT | Contexte produit | Capture exigences DevOS + analyse d'écart plateforme | QA (Agent 2) + Tech Lead | ✅ TERMINÉ | 100% | P1 | Revue de capture | ✅ REQUIREMENTS.md (FR-001→010, AC-001→012) |
| TASK-006 | PRODUIT | DevOS — Assistant vocal proactif | Lifecycle complet FEATURE-001 (Phase 0→7) | Équipe complète | ✅ TERMINÉ | 100% | P1 | Gherkin AC-001→012 + E2E navigateur | ✅ E2E validé · REV-003 approuvée · commits 7ddb0c9, f2485b5, eb1a3d9 |
| TASK-007 | PRODUIT | DevOS — Assistant vocal proactif | M1 — Préférences vocales (schéma + API + UI 9 réglages) | Backend+Frontend | ✅ TERMINÉ | 100% | P1 | curl PUT prefs + E2E reload (AC-005) | ✅ PASS |
| TASK-008 | PRODUIT | DevOS — Assistant vocal proactif | M2 — Scheduler + Notifications (tick, dédup, Web Notifications) | Backend+Frontend | ✅ TERMINÉ | 100% | P1 | Tick idempotent ×2 + E2E AC-002 + FR-002 | ✅ PASS |
| TASK-009 | PRODUIT | DevOS — Assistant vocal proactif | M3 — TTS Web Speech + messages préparés | Frontend | ✅ TERMINÉ | 100% | P1 | E2E voix + test-voice (AC-004) | ✅ PASS |
| TASK-010 | PRODUIT | DevOS — Assistant vocal proactif | M4 — EventListener tâches/échéances/priorités | Backend | ✅ TERMINÉ | 100% | P1 | E2E 3 types d'annonces (AC-003) | ✅ PASS |
| TASK-011 | PRODUIT | DevOS — Assistant vocal proactif | M5 — Heures silencieuses + anti-doublons | Backend+QA | ✅ TERMINÉ | 100% | P1 | E2E 70 s sans doublon (AC-008) + DB expire (AC-009) | ✅ PASS |
| TASK-012 | PRODUIT | DevOS — Assistant vocal proactif | M6 — AIOrchestrator LLM + fallback templates | Backend+Sécurité | ✅ TERMINÉ | 100% | P1 | test-voice ia/template + fallback 429 (AC-012) | ✅ PASS |
| TASK-013 | PRODUIT | DevOS — Assistant vocal proactif | M7 — Sync + ADR arrière-plan Android/Linux (documenté) | TechLead+Doc | ✅ TERMINÉ | 100% | P1 | Revue documentaire ADR-001 | ✅ N/A justifié (AC-011, hors sandbox) |
| TASK-014 | PRODUIT | DevOS — Assistant vocal proactif | Phase 5/6 — E2E navigateur + journaux + commits | QA+DOC+COMMIT | ✅ TERMINÉ | 100% | P1 | E2E agent-browser + validate xlsx | ✅ PASS |
| TASK-015 | PRODUIT | DevOS — Authentification (FEATURE-AUTH, Task 22) | Système auth JWT/bcrypt + scopage multi-utilisateurs intégral (schéma, 11 endpoints, scheduler par user, AuthGate UI, ADR-003) | ORCHESTRATEUR (CTO) | ✅ TERMINÉ | 100% | P1 | 18 tests curl (isolation inter-users incluse) + E2E navigateur (inscription→app→déconnexion→connexion) | ✅ PASS · lint 0 · ADR-003 · contrats v1.1 |
| TASK-016 | PRODUIT | DevOS — Authentification (FEATURE-AUTH, Task 24) | AUDIT GLOBAL #003 post-FEATURE-AUTH + preuve E2E compte (Task 23) + soldes immédiats DEBT-022/019 (Task 24-ter/24-quater) | Audit Global + CTO | ✅ TERMINÉ | 100% | P1 | lint 0 · tsc 2→0 · bun audit 0 CRITIQUE · 24 vérifications curl auth + isolation ×2 · E2E navigateur inscription→reconnexion | ✅ PASS · 77/100 stable · AUTORISÉ SOUS CONDITION · sécurité +16 (78) |
| TASK-017 | PRODUIT | DevOS — Authentification (FEATURE-AUTH, Task 26) | Durcissement sécurité pré-prod : rate limiting DEBT-021 + CSP DEBT-013 + revue indépendante REV-004 (Task 27) | ORCHESTRATEUR (CTO) + AGENT REVIEWER | ✅ TERMINÉ | 100% | P1 | Saturation curl 429 + Retry-After (login 10/15 min, register 5/h) · navigation complète 0 violation CSP · lint 0 · tsc 0 | ✅ PASS · REV-004 APPROUVÉE (0 bloquant/majeur, 4 mineurs tracés) · commits 88f334f, db13a8b |
| TASK-018 | PRODUIT | DevOS — Authentification (FEATURE-AUTH, Task 29) | Responsivité mobile de la vue de connexion (AuthGate) : min-h-dvh + centrage sûr (my-auto), paddings scoped 320 px, h1 sr-only | Frontend / UX (CTO) | ✅ TERMINÉ | 100% | P2 | agent-browser 375/320/667×375 paysage/1280 (hasHScroll=false partout, cardTop=40 px au scroll-top en paysage) · E2E mobile connexion démo · lint 0 · tsc 0 | ✅ PASS · 8 captures before/after · toast mobile top observé · environnement : JWT_SECRET régénéré + seed rejoué (dérive restauration) |
| TASK-019 | PRODUIT | DevOS — Espace de travail (FEATURE-UI-SHELL, Task 33) | Shell complet : sidebar 4 sections + permissions centralisées + 12 vues fonctionnelles + navigation mobile 5 destinations (ADR-004, contrats v1.3) | Équipe complète (CTO) | ✅ TERMINÉ | 100% | P1 | lint 0 · tsc 0 · curl CRUD projects/notes/activity + ai/chat LLM réel · E2E navigateur desktop+mobile (créations UI, smart views, tiroir, 0 erreur console) | ✅ PASS · ADR-004 + ROLES_PERMISSIONS.md · xlsx validate passed · purge artefacts E2E |

## Règles de dépendance rappelées
- Frontend bloqué tant que contrat API non validé (`API_CONTRACTS.md`)
- Backend bloqué sur auth/permissions tant que Security non validé
- Aucune tâche TERMINÉE sans : commits propres + revue positive ; frontend : + a11y + perf
- Aucune livraison PROD sans audit global ≥ 60/100

> Prochaine étape : **AUDIT-005** déclenché après TASK-019 (règle « audit après chaque feature ») ; itération suivante : historique IA persistant, mode mains libres, automatisations, Git/GitHub ; restant **avant toute exposition prod réelle** — DEBT-020 (purge des comptes de démonstration) + verrouillage accès direct :3000 hors passerelle ; dette : DEBT-017 (découpage settings-screen.tsx 632 l.), DEBT-018 (doc), DEBT-003 vague 2 ESLint.
