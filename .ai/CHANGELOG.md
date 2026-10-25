# 📝 CHANGELOG

Format : [Keep a Changelog](https://keepachangelog.com) — versions sémantiques.

## [0.3.0-feature001] — 2026-10-25
### Ajouté — FEATURE-001 « DevOS — Assistant vocal proactif » (M1→M7, livrée de bout en bout)
- **Annonces vocales proactives** : scheduler serveur à état dérivé (ADR-002) — rappels anticipés (fenêtre de grâce 15 min), nouvelles tâches, échéances, changements de priorité ; lecture TTS Web Speech (voix locales, zéro réseau) + Web Notifications (permission explicite)
- **Réglages complets (9)** : activation, délai de rappel personnalisé, 3 types d'annonces indépendants, heures silencieuses (wrap minuit + jours, override urgences), style de message (naturel/professionnel/bref), voix et langue, volume, catégories autorisées, mode discret — persistés serveur (singleton VoicePreferences, défauts actifs AC-001) + miroir localStorage
- **Fiabilité** : anti-doublons DB (`ReminderLog @@unique(taskId,type,scheduledFor)`), anti-frénésie new_task 60 s, tick idempotent, zéro rattrapage (obsolètes → `expire`, jamais rejoués), snooze UI→DB avec re-déclenchement, Suspendre/Reprendre
- **IA optionnelle** : reformulation LLM serveur (timeout 4 s) fidèle aux faits, **templates préparés TOUJOURS d'abord** avec fallback automatique (AC-012)
- **UI** : page unique 3 onglets (Assistant/Tâches/Paramètres), journal vocal aria-live avec badges et actions (Reporter, Voir la tâche), gestion de tâches CRUD, responsive 390px, cibles tactiles ≥44px
### Qualité / dette traitée (11 items sur 15)
- DEBT-001 (relation Prisma), 002 (endpoint /api/health), 004 (ignoreBuildErrors:false), 005 (strictMode), 006 (noImplicitAny:true), 007 (CSS inline), 008 (metadata DevOS), 009 (README racine), 011 (h1), 013 partie headers sécurité (CSP restant), 015 (server component)
- Restant : DEBT-003 vague 1 (ESLint), DEBT-013 CSP (EN COURS), DEBT-010 (REPORTÉ — règle d'environnement), DEBT-012 (ACCEPTÉE)
### Fichiers clés
- `prisma/schema.prisma` (Task, VoicePreferences, ReminderLog) · `src/lib/assistant/{scheduler,templates,quiet-hours,ai,tts,notifications,api,format}.ts` · `src/app/api/{health,tasks,voice-preferences,assistant}/**` · `src/components/assistant/*` · `src/hooks/use-voice-assistant.ts` · `scripts/seed.ts`
### Validation
- E2E navigateur : AC-002/003/004/005/008/009/010/012 + FR-002 PASS (preuves dans `TEST_PLAN.md`) ; AC-001 vérifié code ; AC-007 prouvé curl ; **AC-011 = N/A justifié (ADR-001, hors sandbox)**
- lint exit 0 · tsc 0 erreur · GET / 200 · headers sécurité actifs · validate xlsx passed · revue **REV-003 APPROUVÉE**

### Commits de session (2026-10-25)
- `7ddb0c9` feat(assistant) : backend FEATURE-001 — schéma Prisma, scheduler état dérivé, templates, heure silencieuse, routes API v1, seed
- `f2485b5` feat(assistant) : frontend FEATURE-001 — UI 3 onglets, tick 30 s, TTS Web Speech, notifications, journal vocal
- `eb1a3d9` chore(quality) : vague dette — TS strict, ignoreBuildErrors:false, strictMode, headers sécurité, ESLint vague 1, README, use-toast fix
- (docs) docs(ai) : gouvernance FEATURE-001 — UX/ADRs/contrat v1, journaux, TASKS, dette à jour

## [0.2.1-bootstrap] — 2026-10-25
### Ajouté
- Système de gouvernance multi-agents complet (dossier `.ai/` : contexte, architecture, contrats API, design system, guides a11y/perf, journaux, handoffs, ADR)
- Backlog central `TASKS.xlsx` + miroir `TASKS.md`
- Worklog partagé inter-agents (`worklog.md`)
- Audit global de référence AUDIT-001 (voir `.ai/AUDITS/`)
### Modifié
- (aucun fichier applicatif modifié à ce stade — bootstrap gouvernance uniquement)

### Commits de session (2026-10-25)
- `c428df1` chore(config) : .gitignore standardisé, artefacts DB ignorés, .env retiré du suivi
- `e4ee7b1` chore(scaffold) : scaffold Next.js intégré au suivi git
- `4019e41` docs(ai) : bootstrap système multi-agents (gouvernance + audit AUDIT-001 + backlog)
