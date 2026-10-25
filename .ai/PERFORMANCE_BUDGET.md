# ⚡ BUDGET DE PERFORMANCE

> **Dernière mise à jour** : 2026-10-25 (UTC) · **Responsable** : AGENT PERFORMANCE

## 1. Budgets à ne pas dépasser (Core Web Vitals — cibles)

| Métrique | Cible | Seuil d'alerte | Mesure |
|---|---|---|---|
| LCP (Largest Contentful Paint) | ≤ 2.0 s | > 2.5 s | Navigation `GET /` |
| INP (Interaction to Next Paint) | ≤ 200 ms | > 500 ms | Interactions UI |
| CLS (Cumulative Layout Shift) | ≤ 0.1 | > 0.25 | Chargement |
| TTFB (server) | ≤ 800 ms (dev) | > 1.5 s | `curl` timing |
| Taille JS 1er chargement `/` | ≤ 300 KB gz (dev) | > 500 KB | manifest `.next` |

## 2. Règles d'optimisation applicables

### Frontend
- **Lazy loading** : `next/dynamic` pour tout composant lourd non critique (éditeurs, charts, modales complexes).
- **Images** : `next/image` prioritaire (ESLint img désactivé mais déconseillé) ; `sharp` disponible.
- **Imports arborescents** : jamais `import * from 'lucide-react'` complet — imports nommés.
- **State** : Zustand (client) / TanStack Query (serveur) — pas de re-rendus globaux inutiles ; mémoïser les listes (`React.memo`, `useMemo`).
- **Fonts** : `next/font` déjà utilisé (Geist) — ne pas ajouter de fonts externes bloquantes.

### Backend / Données
- **Prisma** : `select` ciblé (jamais de `findMany` sans limit sur des collections non bornées) ; pagination obligatoire ≥ 20 items.
- **N+1** : `include`/`_count` au lieu de requêtes en boucle.
- **Index** : tout champ filtré/trié fréquemment doit être indexé (`@@index`).
- **Caching** : TanStack Query `staleTime` raisonnable ; cache mémoire local pour référentiels stables.
- **API** : réponse < 50 ms pour opérations simples (SQLite local) ; payload < 100 KB.

## 3. Mesures de référence (baseline au 2026-10-25)

| Page | GET / (dev, compilé) | Statut |
|---|---|---|
| `/` | 859 ms 1er hit à chaud · 24 ms hits suivants (cf. `dev.log`) | ✅ Conforme |

## 4. Processus de contrôle
1. À chaque feature frontend : re-mesure des 5 métriques ci-dessus.
2. Régression > seuil d'alerte → ticket `PERF-XXX` dans `PERF_ISSUES.md` + TASKS.xlsx.
3. Aucune feature frontend marquée TERMINÉE sans validation PERF.

## Journal
- 2026-10-25 : Création du budget ; baseline mesurée sur `/` (AGENT PERF).
