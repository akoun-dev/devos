# 🧪 PLAN DE TESTS (APPROCHE E2E — AGENT 2)

## Stratégie
Le sandbox n'exécute pas de suite de tests automatisée dédiée (pas de runner configuré dans le scaffold — cf. DEBT-010, reportée : règle d'environnement « aucun code de test »).
La validation E2E est réalisée par : vérification lint (`bun run lint`) + vérification serveur (`dev.log`) + **vérification navigateur réelle (Agent Browser)** du golden path de chaque feature + vérifications curl backend + captures des états.

## Matrice par feature (à remplir à chaque FEATURE-XXX)
| ID Feature | Scénario E2E (Gherkin) | Étapes | Résultat attendu | Exécuté le | Verdict |
|---|---|---|---|---|---|
| FEATURE-001 | AC-002 — Rappel anticipé | Tâche seedée avec rappel ON à +15 min → tick | Annonce vocale « Rappel : dans 15 minutes, tu dois préparer la démo DevOS. » + entrée journal + notification | 2026-10-25 | ✅ PASS (preuve : annonce prononcée + journal vocal) |
| FEATURE-001 | AC-003 — 3 types d'annonces séparés | Créer tâche (new_task), tâche avec échéance (deadline), tâche urgente (priority) | 3 types d'annonces distincts (badges Rappel / Nouvelle tâche / Échéance / Priorité) | 2026-10-25 | ✅ PASS (3 types observés séparés dans le journal) |
| FEATURE-001 | AC-004 — Templates ×3 styles + reformulation IA | Tester la voix pour naturel / professionnel / bref ; observer source IA | Messages fidèles aux faits ; reformulation IA ne modifie jamais titre/échéance/priorité | 2026-10-25 | ✅ PASS (templates exacts ; messageSource 'ia' fidèle aux faits) |
| FEATURE-001 | AC-005 — Réglages persistés | Modifier volume/style/rappels → reload page | Préférences conservées (serveur + miroir localStorage) | 2026-10-25 | ✅ PASS (vérifié après reload) |
| FEATURE-001 | AC-008 — Anti-doublons | Laisser tourner 70 s / 2+ ticks avec tâche éligible | Une seule annonce par (task,type,scheduledFor) ; journal stable | 2026-10-25 | ✅ PASS (2 annonces stables après 70 s / 2+ ticks) |
| FEATURE-001 | AC-009 — Heures silencieuses | Activer plage silencieuse couvrant l'heure courante → tick | Badge « Silencieux — non prononcée », annonce JAMAIS rejouée (zéro rattrapage) | 2026-10-25 | ✅ PASS (preuve DB : ReminderLog status='expire', jamais rejouée) |
| FEATURE-001 | AC-010 — Permission notifications | Ouvrir l'onglet Assistant sans permission | Bannière explicative + bouton « Activer » → requestPermission | 2026-10-25 | ✅ PASS (bannière + bouton présents, flux OK) |
| FEATURE-001 | AC-012 — Templates d'abord, LLM décoratif | Couper/dégrader LLM (429) → tick | Fallback template automatique, aucune panne d'annonce | 2026-10-25 | ✅ PASS (429 observé → messageSource 'template') |
| FEATURE-001 | FR-002 — Anti-frénésie | Créer 2 tâches à < 60 s d'intervalle | Une seule annonce new_task ; 2e écartée | 2026-10-25 | ✅ PASS (preuve live : new_task écarté à 29 s, raison anti_frenesie en DB) |
| FEATURE-001 | Snooze UI→DB | « Reporter 5 min » sur une annonce | status='reporte' + snoozedUntil en DB, retrait du journal, re-déclenchement à l'échéance | 2026-10-25 | ✅ PASS (vérifié DB + UI) |
| FEATURE-001 | Suspendre/Reprendre | Cliquer « Suspendre les annonces » → tick | Badge « Suspendu », aucune annonce parlée ; reprise = reprise | 2026-10-25 | ✅ PASS (badge Suspendu observé) |
| FEATURE-001 | Responsive + qualité page | Vue mobile 390px + console | Pas d'overflow-x, 0 erreur console/page, h1 + lang="fr" | 2026-10-25 | ✅ PASS (390px sans overflow, 0 erreur console) |
| FEATURE-001 | AC-007 — Tâche terminée → silence | PATCH status=terminee → tick | Plus AUCUNE annonce pour cette tâche | 2026-10-25 | ✅ PASS (prouvé curl backend : tâche terminée → plus rien) |
| FEATURE-001 | AC-001 — Activé par défaut | Lecture défauts Prisma (VoicePreferences singleton) | enabled=true au premier lancement sans configuration | 2026-10-25 | ✅ PASS (vérifié dans le code : défauts Prisma) |
| FEATURE-001 | AC-011 — Arrière-plan natif Android/Linux | — (hors périmètre sandbox) | N/A | 2026-10-25 | ➖ **N/A justifié** (ADR-001 : arrière-plan WorkManager/AlarmManager/systemd non réalisable dans le sandbox Next.js — documenté, aucune simulation trompeuse ; ADR d'implémentation cible à produire dans le dépôt Flutter) |

### Preuves transverses (2026-10-25)
- Idempotence tick : 2 exécutions successives → 2e retourne `[]` (prouvé 2×, curl + intégration).
- Qualité : `bun run lint` exit 0 ; `tsc --noEmit` 0 erreur (noImplicitAny:true) ; `GET /` 200.
- Headers sécurité actifs (nosniff, X-Frame-Options SAMEORIGIN, Referrer-Policy, Permissions-Policy microphone=()) ; X-Powered-By supprimé.
- Mobile 390px sans overflow-x ; 0 erreur console/page.

## Smoke tests récurrents (à chaque livraison)
| # | Test | Attendu | Dernier résultat |
|---|---|---|---|
| S1 | `GET /` | HTTP 200 + page rendue (h1 DevOS, lang="fr") | ✅ 200 (2026-10-25) |
| S2 | `GET /api/health` | HTTP 200 + `{"status":"ok","db":"ok",...}` (remplace S2 `/api` démo supprimée — DEBT-002) | ✅ 200 ok/db (2026-10-25) |
| S3 | `bun run lint` | 0 erreur | ✅ (2026-10-25) |
| S4 | dev.log sans erreur runtime | Aucun stacktrace | ✅ (2026-10-25) |
| S5 | `POST /api/assistant/tick` ×2 | 2e tick = `[]` (idempotence) | ✅ (2026-10-25) |
