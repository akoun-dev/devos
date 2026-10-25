# 📖 CONTEXT PROJET

> **Dernière mise à jour** : 2026-10-25 (UTC) · **Source** : Analyse initiale AGENT 1 (preuves vérifiées)

## 1. Identité du projet

| Attribut | Valeur | Preuve |
|---|---|---|
| Nom technique | `nextjs_tailwind_shadcn_ts` | `package.json → name` |
| Version | 0.2.1 | `package.json → version` |
| Produit | **DevOS** — assistant de développement personnel · Module en cours : **Assistant vocal proactif et rappels intelligents** (exigences capturées : `REQUIREMENTS.md` FR-001→010, AC-001→012) | Contexte CTO 2026-10-25 |
| Cible déclarée | Flutter/Dart (Android/Linux) · SQLite Drift · Supabase · IA locale Gemma | spec DevOS |
| Adaptation sandbox | **Web Next.js 16** (équivalents : Prisma/SQLite, Web Speech API, Web Notifications, LLM z-ai côté serveur + fallback préparé) — écarts documentés, aucun simulé comme natif | `REQUIREMENTS.md` §5 |

## 2. Stack détectée (NON NÉGOCIABLE)

| Couche | Technologie | Version |
|---|---|---|
| Framework | Next.js (App Router) | ^16.1.1 |
| Langage | TypeScript 5 (`strict: true` mais `noImplicitAny: false` — mode strict affaibli, cf. R2) | ^5 |
| UI | React | ^19.0.0 |
| Styling | Tailwind CSS 4 + tw-animate-css | ^4 |
| Composants | shadcn/ui (style New York) + Radix UI + Lucide | ~50 composants dans `src/components/ui/` |
| ORM / DB | Prisma 6 + SQLite (`db/custom.db`) | ^6.11.1 |
| État client | Zustand 5 / TanStack Query 5 (disponibles, non utilisés) | ^5.0.6 / ^5.82.0 |
| Validation | Zod 4 | ^4.0.2 |
| Auth | NextAuth v4 (disponible, non configuré) | ^4.24.11 |
| Runtime / PM | Bun (dev sur port 3000) | — |
| AI SDK | z-ai-web-dev-sdk (backend uniquement) | ^0.0.18 |

## 3. Environnement d'exécution

- **Port unique exposé** : 3000 (Next.js) via gateway Caddy (`Caddyfile`) — services additionnels via `?XTransformPort=<port>`.
- **Dev server** : `bun run dev` → log dans `dev.log`. État au 2026-10-25 : ✅ `GET / 200`.
- **DB** : SQLite initialisée, schéma démo (`User`, `Post`), aucune donnée métier.
- **WebSocket** : exemple disponible dans `examples/websocket/` (mini-services sur port dédié).
- **Timezone projet** : Africa/Abidjan (UTC).

## 4. Périmètre actuel du code

```
src/
├── app/
│   ├── page.tsx          → Page d'accueil scaffold (logo Z.ai uniquement)
│   ├── layout.tsx        → Layout racine + fonts Geist + Toaster
│   ├── globals.css       → Tokens Tailwind 4 (thème neutre oklch, clair/sombre)
│   └── api/route.ts      → GET /api → { message: "Hello, world!" } (démo)
├── components/ui/        → Kit shadcn/ui complet (~50 composants)
├── hooks/                → use-toast, use-mobile
└── lib/                  → utils (cn), db (client Prisma singleton)
```

## 5. Contraintes imposées au projet

1. Une seule route utilisateur visible : `/` (les features s'assemblent dans `src/app/page.tsx` et ses composants).
2. Appels API en routes `/api/*` (pas de Server Actions imposés par le client).
3. z-ai-web-dev-sdk **exclusivement côté serveur**.
4. Prisma : schéma dans `prisma/`, DB dans `db/`, types primitifs non-list au niveau schéma.
5. Composants shadcn/ui existants réutilisables — ne pas réinventer.
6. Design responsive obligatoire + footer sticky si présent.
7. Pas de bleu/indigo sauf demande explicite du CTO.
8. ESLint : `bun run lint` doit rester propre ; build interdit (`next build` non utilisé en sandbox).

## 6. Risques & constats initiaux (transmis à l'Audit)

| # | Constat | Sévérité | Preuve |
|---|---|---|---|
| R1 | 27 règles ESLint désactivées (qualité dégradée par défaut) — corrigé suite AUDIT-001 (comptage exact) | MINEUR (scaffold) | `eslint.config.mjs:12-44` |
| R2 | `next.config.ts → ignoreBuildErrors: true` masque les erreurs TS au build + `noImplicitAny: false` (tsconfig.json:9) affaiblit le mode strict + `reactStrictMode: false` | MINEUR (scaffold) | `next.config.ts:6-10`, `tsconfig.json:8-9` |
| R3 | Metadata scaffold Z.ai (titre/description à remplacer dès la 1ère feature) | MINEUR | `layout.tsx:17-36` |
| R4 | Logique de présentation en CSS inline dans `page.tsx` (à remplacer par Tailwind) | MINEUR | `page.tsx:5-29` |
| R5 | Aucun README projet à la racine | MINEUR | arborescence |

## 7. Historique du contexte

- 2026-10-25 : Prise en charge du projet par le système multi-agents. Analyse initiale complète (AGENT 1). Bootstrap gouvernance + AUDIT-001 (70/100).
- 2026-10-25 : Contexte produit reçu — **DevOS, module « Assistant vocal proactif et rappels intelligents »**. Exigences capturées (FR-001→010, AC-001→012). Analyse d'écart plateforme consignée. **Développement bloqué en attente du signal « GO » du CTO.**
