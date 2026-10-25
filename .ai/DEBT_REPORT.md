# 🏗️ REGISTRE DE LA DETTE TECHNIQUE (DEBT-XXX)

> **Dernière mise à jour** : 2026-10-25 (UTC) · **Responsable** : AGENT AUDIT GLOBAL · **Source** : AUDIT GLOBAL #001 (baseline)
> **Statuts** : OUVERT / EN COURS / TRAITÉ / ACCEPTÉ (dette assumée). Chaque item cite une preuve vérifiée le 2026-10-25.

## Statistiques

| Classification | Nombre | Items |
|---|---|---|
| 🔴 CRITIQUE | **0** | — |
| 🟠 MAJEUR | **7** | DEBT-001, 003, 004, 006, 010, 013, 014 |
| 🟡 MINEUR | **8** | DEBT-002, 005, 007, 008, 009, 011, 012, 015 |
| **Total** | **15** | 0 traité · 15 ouverts |

> Lecture : dette « d'origine scaffold » typique — rien de bloquant pour démarrer les features, mais les 7 MAJEUR doivent être soldés dans les 1-2 premières features (avant toute mise en prod réelle).

## Registre

| ID | Description | Classification | Effort | Fichiers concernés | Impact si non corrigé | Priorisation recommandée | Statut |
|---|---|---|---|---|---|---|---|
| DEBT-001 | Relation Prisma `Post.authorId → User.id` non déclarée (champ orphelin, pas d'intégrité référentielle ni d'include Prisma possible) | MAJEUR | S | `prisma/schema.prisma:24-32` | Requêtes N+1 / données orphelines dès que les Posts seront utilisés ; migration corrective plus coûteuse avec des données | À traiter dès la 1re évolution du schéma (1re feature) | OUVERT |
| DEBT-002 | Endpoint démo `GET /api` retournant `{ message: "Hello, world!" }` — à remplacer par `/api/health` structuré (uptime, version, check DB) | MINEUR | S | `src/app/api/route.ts:3-5`, `.ai/API_CONTRACTS.md` | Pas de sonde de santé exploitable pour le monitoring ; confusion démo/production | Remplacer lors de la 1re feature backend | OUVERT |
| DEBT-003 | **27 règles ESLint désactivées** (6 TS, 6 React, 2 Next, 13 générales — incl. `no-explicit-any`, `no-unused-vars`, `exhaustive-deps`, `no-console`) | MAJEUR | M | `eslint.config.mjs:12-44` (comptage `rg -c '"off"'` = 27) | « Lint propre » non significatif ; bugs classiques (deps manquantes, variables mortes, any silencieux) non détectés | Réactivation par vagues à la 1re feature (commencer par `no-unused-vars`, `exhaustive-deps`, `no-console`) | OUVERT |
| DEBT-004 | `ignoreBuildErrors: true` — les erreurs TypeScript n'échouent pas le build | MAJEUR | S | `next.config.ts:7` | Régressions de types invisibles au build/CI ; faux sentiment de verte | Passer à `false` lors de la 1re feature (corriger les erreurs révélées) | OUVERT |
| DEBT-005 | `reactStrictMode: false` — détection des effets impurs et doubles rendus désactivée | MINEUR | S | `next.config.ts:9` | Effets de bord non détectés en dev ; comportements React non idiomatiques | Passer à `true` avec la 1re feature UI | OUVERT |
| DEBT-006 | `strict: true` mais **`noImplicitAny: false`** — TypeScript « strict » affaibli | MAJEUR | S | `tsconfig.json:8-9` | `any` implicites tolérés : perte majeure de sûreté de types, contredit la doc (`PROJECT_CONTEXT.md:19`) | Passer à `true` lors de la 1re feature | OUVERT |
| DEBT-007 | Logique de présentation en **CSS inline** (styles objet) au lieu de classes Tailwind | MINEUR | S | `src/app/page.tsx:5-29` | Incohérence avec le design system Tailwind 4 ; pas de responsive/variants ; redevabilité au rework | Migrer vers Tailwind lors de la 1re feature UI (la page sera remplacée) | OUVERT |
| DEBT-008 | Metadata scaffold Z.ai (titre, description, OpenGraph `chat.z.ai`, favicon CDN externe) | MINEUR | S | `src/app/layout.tsx:16-36` | Référencement/branding faux pour le produit final ; favicon dépendante d'un CDN tiers | Remplacer dès la 1re feature (nom produit à définir par le CTO) | OUVERT |
| DEBT-009 | **README racine absent** (installation, scripts, conventions non documentées pour un humain entrant) | MINEUR | S | racine `/home/z/my-project/` (aucun README.md — vérifié par listing) | Onboarding difficile ; le dossier `.ai/` ne remplace pas un README développeur | Créer à J+1 (action #4 du plan AUDIT-001) | OUVERT |
| DEBT-010 | **Aucun test automatisé** : pas de runner (aucun script `test` dans package.json:5-14), aucun `*.test.*`/`*.spec.*` ; `tests/` = scripts shell d'infra runtime uniquement | MAJEUR | L | `package.json`, `tests/` (3 scripts shell) | Aucun filet de régression : chaque feature augmente le risque ; QA limitée aux smoke tests manuels S1-S4 (`TEST_PLAN.md`) | Introduire Vitest (unit) + Playwright (E2E) dès la 1re feature ; 1er test sur `/api/health` | OUVERT |
| DEBT-011 | **H1 manquant sur la page d'accueil** — la page ne contient qu'une `div` + `img` (hiérarchie de titres vide) — WCAG 1.3.1 / 2.4.6 | MINEUR | S | `src/app/page.tsx:4-30` | Navigation lecteurs d'écran dégradée ; SEO faible | Ajouter `h1` lors de la 1re feature UI | OUVERT |
| DEBT-012 | Fichier > 500 lignes : `sidebar.tsx` = **726 lignes** (composant shadcn/ui vendu) | MINEUR | S | `src/components/ui/sidebar.tsx` (wc -l : 726) | Maintenabilité du composant vendu ; dette acceptée tant qu'il n'est pas modifié | ACCEPTABLE tel quel — ne pas modifier sans nécessité ; surveiller si personnalisé | OUVERT (acceptée) |
| DEBT-013 | **Aucun header de sécurité configuré** (pas de `headers()` dans next.config.ts) + **`X-Powered-By: Next.js` exposé** ; absence CSP / HSTS / X-Frame-Options / X-Content-Type-Options (vérifié `curl -sI http://localhost:3000`) | MAJEUR | S | `next.config.ts` (aucun bloc `headers`), réponse HTTP `/` | Clickjacking, MIME-sniffing, énumération de stack dès exposition réelle | Configurer les headers + `poweredByHeader: false` à la 1re feature (avant toute prod) | OUVERT |
| DEBT-014 | **Travail de gouvernance non commité** : 1 seul commit (`09c67ac Initial commit`) ; `git status` = `.gitignore` modifié + 19 entrées non suivies (`.ai/`, `src/`, `prisma/`, `worklog.md`, …) ; `COMMIT_LOG.md` vide | MAJEUR | S | dépôt git entier ; `.ai/COMMIT_LOG.md` | Risque de perte du bootstrap ; revue de code impossible ; traçabilité conventionnelle inexistante | Session de commits atomiques conventionnels à J+1 (action #2 du plan AUDIT-001) | OUVERT |
| DEBT-015 | `page.tsx` : `'use client'` inutile (aucune interactivité → devrait être server component) + `<img>` au lieu de `next/image` | MINEUR | S | `src/app/page.tsx:1,19-27` | JS client inutile ; image non optimisée (pas de lazy/sizing automatiques) | Corriger lors de la 1re feature UI (page appelée à être remplacée) | OUVERT |

## Plan de traitement recommandé

1. **Immédiat (J+1, avant toute feature)** : DEBT-014 (commits) → DEBT-009 (README) — prérequis de traçabilité et d'onboarding.
2. **1re feature (fenêtre J+7)** : DEBT-003, DEBT-004, DEBT-006, DEBT-005 (réactivation des garde-fous qualité) ; DEBT-013 (headers sécurité) ; DEBT-010 (runner de tests + 1er test) ; DEBT-001, DEBT-002 (schéma + `/api/health`).
3. **1re feature UI** : DEBT-007, DEBT-011, DEBT-015, DEBT-008 (la page d'accueil et les metadata seront de toute façon retravaillées).
4. **Sans échéance** : DEBT-012 (dette vendue assumée, à surveiller).

> Règle de suivi : tout item DEBT-XXX corrigé passe en `TRAITÉ` avec preuve (commit + vérification), et l'information est reportée dans le prochain audit global. Un item MAJEUR non traité après 2 features déclenche une alerte dans `AUDIT_REPORT.md`.
