# ADR-004 — Shell applicatif : navigation centralisée, permissions et navigation adaptative

- **Statut** : ACCEPTÉ
- **Date** : 2026-10-26
- **Décideurs** : CTO (orchestrateur)
- **Contexte** : FEATURE-UI-SHELL (exigence CTO 2026-10-26) — l'app passe de 3 onglets (Assistant/Tâches/Paramètres) à un espace de travail structuré (4 sections, ~17 destinations) avec sidebar desktop, navigation mobile dédiée et séparation des espaces (travail / IA / développement / système).

## Décision

1. **Page unique `/` + routeur d'état** : la navigation reste un état client (`viewId`) — aucune route supplémentaire, conforme à la contrainte d'architecture de la plateforme (une seule page visible) et à la posture 0 middleware (ADR-003).
2. **Registre de navigation centralisé** (`src/lib/navigation.ts`) : chaque destination y est déclarée UNE fois (id, libellé, section, icône, rôle minimal, statut `active | planned`, description). La sidebar (desktop) et le tiroir mobile (Sheet) sont **générés depuis ce registre** — aucun menu dupliqué en dur (l'ancienne barre inférieure mobile a été retirée, cf. amendement §4).
3. **Permissions centralisées** (`src/lib/permissions.ts`) : matrice rôles×vues (ROLES_PERMISSIONS.md), fonction `canAccessView(viewId, role)` consultée par le registre ; v1 = tous les comptes authentifiés sont `proprietaire`. La sécurité réelle reste côté backend (scopage userId obligatoire sur chaque endpoint — jamais basée sur le masquage de menus).
4. **Navigation adaptative** :
   - Desktop (lg+) : **sidebar fixe** visible avec libellés complets et sections ;
   - Mobile : **tiroir de navigation** (Sheet) seul ; bouton micro accessible depuis l'en-tête.
   - **Amendement 2026-10-26 (décision CTO, TASK-020)** : la **barre inférieure mobile à 5 destinations est supprimée** — le CTO exige une navigation mobile réduite au **tiroir uniquement** (« retire le menu compacte, garde juste la sidebar (drawer) »). Les vues passent en **pleine largeur (w-full)** sur web (suppression du conteneur `max-w-5xl`). Le champ `mobilePrimary` et l'export `MOBILE_PRIMARY_ITEMS` du registre sont retirés (registre à source unique conservé : sidebar + tiroir générés depuis `NAV_SECTIONS`).
5. **Menus avancés progressifs** : les destinations non implémentées (Git, GitHub, Terminal, Automatisations, Stockage & Sauvegardes) sont affichées avec statut `planned` → désactivées + badge « Bientôt » et vue explicative (`coming-soon-view`) — **jamais de lien mort, jamais de menu caché discrètement**.
6. **Réutilisation de l'existant** : l'assistant vocal (FEATURE-001 : hook `useVoiceAssistant`, AssistantPanel, SettingsScreen) reste le moteur ; les nouvelles vues le consomment via props/state partagé. `TasksManager` est remplacé par des composants découpés (task-form-dialog, task-card, tasks-badges) qui alimentent les « smart views » du cahier des charges (Ma journée, En retard, Prioritaires…).

## Conséquences

- +2 modèles Prisma (`Project`, `Note`) + `Task.projectId` nullable (migration additive, sans perte de données) ;
- +6 endpoints API (contrat v1.3) tous scopés `userId` avec Zod strict et erreurs uniformes `{ error }` ;
- L'Assistant IA consomme un nouveau backend `/api/ai/chat` (SDK serveur uniquement) — **sans accès outillé aux données** en v1 (capacités IA graduées, cf. ROLES_PERMISSIONS.md §3) ;
- La dette DEBT-017 (découpage UI) est partiellement soldée : TasksManager (531 l.) disparaît au profit de fichiers < 300 l. ; SettingsScreen (632 l.) reste (réutilisé tel quel) ;
- Évolutions futures sans refonte : activer une destination = passer son statut à `active` + implémenter sa vue.

## Alternatives écartées

- **Routes Next.js par vue** (`/projets`, `/taches`…) : contredit la contrainte page unique de la plateforme ; navigation par état plus simple à sécuriser ;
- **Masquer les menus non implémentés** : le CTO exige la visibilité de la structure cible (maquette vivante) — badge « Bientôt » préféré ;
- **Implémenter immédiatement tous les modules** : contraire à la recommandation CTO §6 (sidebar stable + vues réellement fonctionnelles d'abord).
