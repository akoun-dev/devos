# 📊 BACKLOG CENTRAL — Vue lisible (miroir de TASKS.xlsx)

> **Dernière mise à jour** : 2026-10-25 (UTC) · **Responsable** : AGENT 2 · **Source de vérité** : `.ai/TASKS.xlsx`

## Statistiques

| Statut | Nombre |
|---|---|
| ✅ Terminées | 14 |
| 🔄 En cours | 0 |
| ⏳ À faire | 0 |
| 🚫 Bloquées | 0 |
| **Total** | **14** |

**Progression moyenne : 100 %** · **Score santé projet : 70/100** (AUDIT-001 · 0 CRITIQUE · AUDIT-002 pending) · **Dette : 15 items — 11 TRAITÉ · 2 EN COURS · 1 REPORTÉ · 1 ACCEPTÉE**

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

## Règles de dépendance rappelées
- Frontend bloqué tant que contrat API non validé (`API_CONTRACTS.md`)
- Backend bloqué sur auth/permissions tant que Security non validé
- Aucune tâche TERMINÉE sans : commits propres + revue positive ; frontend : + a11y + perf
- Aucune livraison PROD sans audit global ≥ 60/100

> Prochaine étape : **AUDIT-002** (Task 21) — revue globale post-FEATURE-001 avant toute mise en prod réelle.
