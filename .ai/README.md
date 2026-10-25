# 📚 DOSSIER DE PILOTAGE — Système Multi-Agents

> **Dernière mise à jour** : 2026-10-25 (UTC) · **Orchestrateur** : AGENT 1 (Tech Lead & Architecte)

Ce dossier constitue la **source de vérité** du pilotage du projet par le système multi-agents autonome.
Tout agent DOIT consulter ce dossier avant d'agir et y enregistrer ses livrables.

## 🗂️ Index des fichiers

### Connaissance projet (contexte partagé)
| Fichier | Rôle | Agent responsable |
|---|---|---|
| `PROJECT_CONTEXT.md` | Contexte produit, périmètre, contraintes | Agent 1 |
| `ARCHITECTURE.md` | Architecture réelle du code (mise à jour à chaque évolution) | Agent 1 |
| `API_CONTRACTS.md` | Contrats d'API exacts (API-FIRST obligatoire) | Agent 1 + Backend |
| `DESIGN_SYSTEM.md` | Design tokens, composants réutilisables | Agent UX/UI |
| `ACCESSIBILITY_GUIDE.md` | Règles WCAG applicées au projet | Agent a11y |
| `PERFORMANCE_BUDGET.md` | Budgets de performance à ne pas dépasser | Agent Perf |
| `REQUIREMENTS.md` | Exigences produit validées par le CTO | Agent 2 (QA/PO) |
| `ADR/` | Decision Architecture Records (décisions majeures) | Agent 1 |

### Suivi d'exécution
| Fichier | Rôle | Agent responsable |
|---|---|---|
| `TASKS.xlsx` | ⭐ Backlog central (colonnes normées, cf. section 5 du protocole) | Agent 2 |
| `TASKS.md` | Vue lisible du backlog | Agent 2 |
| `TEAM_STATUS.md` | Tableau de bord temps réel de l'équipe | Agent 1 |
| `CHANGELOG.md` | Journal des livraisons | Agent Doc |
| `COMMIT_LOG.md` | Journal des commits conventionnels | Agent Commit |
| `REVIEW_LOG.md` | Journal des revues de code | Agent Reviewer |
| `DAILY_STANDUP.md` | Standup simulé quotidien | Agent 2 |
| `TEST_PLAN.md` | Plan de tests E2E | Agent 2 |
| `REGRESSIONS.md` | Régressions détectées/évitées | Agent 2 |

### Qualité & Audit
| Fichier | Rôle | Agent responsable |
|---|---|---|
| `BUGS.md` | Bugs fonctionnels (BUG-XXX) | Agent 2 |
| `SEC_BUGS.md` | Vulnérabilités (SEC-XXX) | Dev Sécurité |
| `A11Y_BUGS.md` | Problèmes d'accessibilité (A11Y-XXX) | Agent a11y |
| `PERF_ISSUES.md` | Problèmes de performance (PERF-XXX) | Agent Perf |
| `SECURITY_AUDIT.md` | Rapport d'audit sécurité consolidé | Dev Sécurité |
| `AUDIT_REPORT.md` | Synthèse des audits globaux | Agent Audit |
| `AUDITS/` | Historique complet des audits (AUDIT-XXX-DATE.md) | Agent Audit |
| `DEBT_REPORT.md` | Dette technique quantifiée | Agent Audit |
| `SYSTEM_COMPLIANCE.md` | Conformité du projet aux règles du système | Agent Audit |
| `INCIDENTS.md` | Incidents & integrity violations | Agent 2 |
| `LESSONS_LEARNED.md` | Capitalisation d'apprentissage | Tous |

### Workflow & Handoffs
| Fichier | Rôle |
|---|---|
| `WORKFLOWS.md` | Processus détaillé du lifecycle des features |
| `HANDOFF/` | Passations inter-agents (LEAD_TO_TEAM, BACKEND_TO_FRONTEND, etc.) |
| `SPECS/` | Spécifications UX / fonctionnelles / techniques par feature |

## ⚖️ Règles d'or du dossier
1. **Intégrité absolue** : tout statut écrit ici doit être prouvable (fichier, ligne, commande).
2. **API-FIRST** : aucune feature frontend ne démarre sans contrat dans `API_CONTRACTS.md`.
3. **Un fichier = un responsable** : les modifications par un autre agent doivent être signalées.
4. **TASKS.xlsx fait foi** : le statut des tâches y est mis à jour avant toute déclaration publique.
5. **Audit obligatoire** : aucune livraison PROD sans `AUDIT_REPORT.md` valide (score ≥ 60/100).
