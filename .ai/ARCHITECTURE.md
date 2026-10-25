# 🏗️ ARCHITECTURE DU PROJET

> **Dernière mise à jour** : 2026-10-25 (UTC) · **Responsable** : AGENT 1 · **Statut** : état initial scaffold

## 1. Vue d'ensemble

```
┌─────────────────────────────────────────────────────────┐
│                     GATEWAY CADDY :81                    │
│   ?XTransformPort=<port> → mini-services | défaut :3000 │
└──────────────────────────┬──────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────┐
│              NEXT.JS 16 APP ROUTER :3000                 │
│                                                          │
│  src/app/                    src/lib/        src/hooks/  │
│  ├── page.tsx (UI '/')       ├── db.ts       ├── use-*   │
│  ├── layout.tsx              └── utils.ts                │
│  └── api/** (REST JSON)                                  │
└──────────────────────────┬──────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────┐
│              PRISMA CLIENT (singleton)                   │
│              SQLite → db/custom.db                       │
└─────────────────────────────────────────────────────────┘
```

## 2. Séparation des couches (RÈGLE N°22 — obligatoire)

| Couche | Localisation | Interdictions |
|---|---|---|
| **UI (Présentation)** | `src/app/**` (pages), `src/components/**` | ❌ Aucun accès direct Prisma/DB |
| **Hooks / État client** | `src/hooks/**`, Zustand stores | ❌ Aucune requête DB directe |
| **Service / Logique métier** | `src/lib/services/**` (à créer à la 1ère feature) | ❌ Aucun import React |
| **Accès données** | `src/lib/db.ts` (Prisma singleton) — consommé uniquement par services/API | ❌ Jamais importé dans un composant client |
| **API (Controllers)** | `src/app/api/**/route.ts` | Validation Zod obligatoire, délègue aux services |
| **Schéma** | `prisma/schema.prisma` | Types primitifs non-list ; migrations via `bun run db:push` |

## 3. Conventions de nommage (application uniforme)

| Élément | Convention | Exemple |
|---|---|---|
| Routes API | kebab-case, REST | `/api/tasks`, `/api/tasks/[id]` |
| Composants | PascalCase, 1 fichier = 1 composant | `TaskCard.tsx` |
| Hooks | camelCase préfixé `use` | `useTasks.ts` |
| Services | camelCase suffixé `Service` | `taskService.ts` |
| Types/DTO | PascalCase + suffixe contextuel | `TaskDto`, `CreateTaskInput` |
| Modèles Prisma | PascalCase singulier | `Task` |
| Branches Git | `feature/FEATURE-XXX-*`, `fix/BUG-XXX-*` | `feature/FEATURE-001-crud-tasks` |
| Commits | Conventional Commits | `feat(api): ...` |

## 4. Modèle de données (état actuel — démo scaffold)

```prisma
model User  { id String @id @default(cuid()) · email String @unique · name String? · timestamps }
model Post  { id · title · content? · published · authorId · timestamps }   // démo, non reliée
```
> ⚠️ Relation `Post.authorId → User.id` **non déclarée** dans le schéma actuel — à normaliser dès la première évolution du modèle. Tracé dans `DEBT_REPORT.md` (DEBT-001).

## 5. Frontend ↔ Backend (protocole API-FIRST)

1. Backend écrit le contrat dans `API_CONTRACTS.md` (endpoint, méthode, DTO entrée/sortie, codes d'erreur).
2. Handoff `HANDOFF/BACKEND_TO_FRONTEND.md`.
3. Frontend consomme via hooks dédiés (`src/hooks/use<Entité>.ts`) — jamais de `fetch` dispersé dans les composants.
4. Types partagés dans `src/types/` (à créer) — source unique entre contrats et consommateurs.

## 6. Décisions d'architecture (ADR)

Toute décision majeure est enregistrée dans `ADR/ADR-XXX-*.md` (template : `ADR/TEMPLATE.md`).

| ADR | Décision | Date | Statut |
|---|---|---|---|
| *(aucune pour l'instant — scaffold initial)* | — | — | — |

## 7. Historique des modifications
- 2026-10-25 : Création du document à partir de l'analyse initiale du scaffold (AGENT 1).
