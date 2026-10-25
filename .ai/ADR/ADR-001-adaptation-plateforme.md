# ADR-001 — Adaptation plateforme : spec DevOS (Flutter) → sandbox Next.js 16
> **Statut** : ACCEPTÉ · **Date** : 2026-10-25 · **Décideur** : Tech Lead · **Task** : 10-b
> **Règle d'honnêteté** : aucun mécanisme cible n'est simulé trompeusement ; chaque écart est documenté et marqué N/A aux tests avec justification.

## Contexte
La spec DevOS déclare une cible **Flutter/Dart + Drift (SQLite) + Supabase + Gemma local + arrière-plan Android/Linux**. L'environnement d'exécution réel est un **sandbox web Next.js 16 (port unique 3000, Prisma/SQLite, gateway Caddy)**.

## Décisions de correspondance

| Composant spec | Implémentation sandbox | Niveau d'équivalence |
|---|---|---|
| UI Flutter | Next.js + shadcn/ui (page unique à onglets) | Complet |
| Drift (SQLite local) | **Prisma 6 + SQLite** (`db/`) | Équivalent (ORM diff.) |
| `VoicePreferencesRepository` | Table `VoicePreferences` (singleton) + miroir `localStorage` (affichage hors ligne) | Équivalent |
| `ReminderScheduler` (Dart timers / WorkManager) | **Tick applicatif** : client `setInterval(30 s)` → `POST /api/assistant/tick` ; état dérivé recalculé à chaque tick | ⚠️ Équivalent **onglet ouvert requis** — l'arrière-plan natif Android (AlarmManager/WorkManager) et Linux (service systemd) est **non réalisable dans le sandbox : documenté, non simulé** (AC-011 → N/A justifié) |
| `NotificationService` | **Web Notifications API** (`requestPermission()` explicite + bannière d'explication) | ⚠️ Équivalent |
| `TextToSpeechProvider` | Interface + **Web Speech API** (`speechSynthesis`, voix locales du navigateur, zéro réseau) | ⚠️ Équivalent (moteurs système selon navigateur) |
| Gemma local / AIOrchestrator | **z-ai-web-dev-sdk (LLM, serveur uniquement)** pour reformulation optionnelle + **templates préparés** toujours disponibles (ADR-002) | ⚠️ Équivalent (fallback = AC-012) |
| Supabase SyncIntegration | Couche interne simulée : recalc automatique par tick (état dérivé) — **pas de vrai cloud sync** | ⚠️ Simulé honnêtement |
| Fuseau horaire | Sandbox/CTO = **Africa/Abidjan (UTC+0 constant)** → `now` serveur = heure locale ; wrap minuit des plages silencieuses géré | Complet |

## Conséquences
- Les critères AC-001→010, AC-012 sont **testables dans le sandbox** ; **AC-011 (arrière-plan natif) est N/A ici** et fera l'objet de l'ADR d'implémentation cible (WorkManager/AlarmManager ; systemd) dans le dépôt Flutter — le présent ADR en tient lieu de spécification d'écart.
- La voix ne peut pas jouer lorsque l'onglet est fermé : limitation documentée dans la bannière permissions (aucune fausse promesse).
