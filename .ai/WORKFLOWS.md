# 📅 WORKFLOWS — Processus du système multi-agents

> **Dernière mise à jour** : 2026-10-25 (UTC)

## 1. Boucle autonome maîtresse

```
SCAN → COMPRENDRE → CONCEPTION UX (UX/UI) → PLANIFIER (Tech Lead + ADR)
→ DÉLÉGUER (Back/Front/DevOps) → COMMIT → REVIEW → DOC
→ AUDIT SÉCURITÉ → VALIDER A11Y → VALIDER PERF → TESTER (QA)
→ DÉTECTER → CORRIGER → RETESTER → VALIDER
→ MAJ TASKS.xlsx → DAILY STANDUP → LESSONS LEARNED
→ AUDIT GLOBAL (périodique) → PROCHAINE TÂCHE
```

## 2. Lifecycle d'une feature (8 phases)

| Phase | Agent responsable | Livrable de sortie | Critère de passage |
|---|---|---|---|
| 0. Conception UX/UI | UX/UI Designer | `SPECS/FEATURE-XXX_UX.md` | Wireframes + flow validés |
| 1. Capture & spécification | QA (Agent 2) | `SPECS/FEATURE-XXX.md` (Gherkin) | Cas d'acceptation exécutables |
| 2. Design technique | Tech Lead (Agent 1) | `SPECS/FEATURE-XXX_TECH_DESIGN.md` + contrat API | Contrat dans `API_CONTRACTS.md` + ADR si décision majeure |
| 3. Découpage & planification | Agent 1 + Agent 2 | Lignes TASKS.xlsx + dépendances | Chaque tâche a un rôle assigné |
| 4. Implémentation | Équipe opérationnelle | Code + handoffs | Séparation des couches respectée, API-FIRST |
| 5. Revue, intégration, tests | Commit → Reviewer → Doc → Security → a11y → Perf → QA E2E | Logs + rapports | Tous les agents valident leur domaine |
| 6. Validation & doc finale | Agent 2 + Doc | CHANGELOG, TASKS à jour, archivage SPECS | Statut VALIDÉ dans TASKS.xlsx |
| 7. Rétrospective | Tous | LESSONS_LEARNED.md | Leçons notées |
| 8. Audit global périodique | Agent Audit | `AUDITS/AUDIT-XXX-DATE.md` | Score ≥ 60/100 |

## 3. Ordre strict de la Phase 5
1. AGENT COMMIT vérifie et commit
2. AGENT REVIEWER revue indépendante
3. AGENT DOCUMENTATION met à jour la doc
4. DEV SECURITÉ audite les commits
5. AGENT a11y valide l'accessibilité
6. AGENT PERFORMANCE valide les métriques
7. AGENT 2 teste E2E
8. AGENT 2 valide ou crée tickets (BUG/SEC/A11Y/PERF-XXX)

## 4. Déclencheurs d'audit global
- **Périodique** : toutes les 5 features terminées / hebdomadaire / milestone
- **Sur demande** : CTO, après incident majeur, avant livraison PROD, après changement architectural
- **Signaux faibles** : 3+ mensonges QA, 3+ PR bloquées, 3+ vulnérabilités CRITIQUES, vélocité -30%

## 5. Gestion des conflits
1. Discussion factuelle avec preuves dans le fichier `.ai/` concerné
2. Si désaccord persistant → décision AGENT 1 (Tech Lead), consignée en ADR
3. Non-conformité CRITIQUE détectée par Audit → blocage PROD jusqu'à correction + revalidation
