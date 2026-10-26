# FEATURE-021 — Conception technique proposée

- Statut : PROPOSITION À VALIDER
- Stack conservée : Next.js App Router, TypeScript, Zod, Prisma/SQLite, shadcn/ui.
- Références : .ai/API_CONTRACTS.md, ADR-003, ADR-004.

## Flux
UI GitHub → hook client → route API POST /api/github/repositories → validation Zod → vérification session DevOS → appel fixe à l'API GitHub avec Authorization Bearer → mapping vers DTO minimal → UI.

Le client ne contacte pas directement api.github.com. Le serveur ne doit jamais accepter une URL d'API fournie arbitrairement par le client. Réponses dépendantes du token avec Cache-Control: no-store.

## Gestion du token
- Mémoire client uniquement, effacé au rechargement et à la déconnexion.
- POST HTTPS uniquement, jamais dans une query string.
- Ne jamais logger le corps de requête, Authorization, token ou erreurs brutes GitHub.
- Ne pas persister dans SQLite/Prisma, cookies, localStorage ou sessionStorage.
- Mapper la réponse GitHub vers un DTO minimal et ne pas relayer les en-têtes bruts.
- Convertir les erreurs en statuts stables : token invalide, permission/rate limit, service indisponible.
- Exiger une session DevOS sur toutes les routes de listing et d'import.

## Association à un projet
Le dépôt choisi est associé à un projet local. Ajouter de façon additive, si le schéma existant le permet, des champs optionnels sourceProvider, sourceRepositoryId, sourceRepositoryUrl et sourceDefaultBranch. Éviter les doublons via contrainte unique composée ou validation transactionnelle. Aucun champ token ne doit être ajouté au schéma.

Toute évolution Prisma doit être additive, accompagnée d'une migration et synchronisée avec les contrats API. Pas de migration destructive ni d'option accept-data-loss.

## Tests de sécurité et qualité
- Requête sans token, token invalide, permissions insuffisantes, rate limit et GitHub indisponible.
- Dépôt privé accessible avec autorisations appropriées.
- Isolation inter-utilisateurs et confirmation explicite de l'import.
- Vérifier que le token n'apparaît ni dans les logs, ni les réponses, ni le stockage.
- Vérifier le responsive et l'absence de navigation mobile inférieure.
- Lint, TypeScript, tests API et tests E2E requis avant de déclarer la feature terminée.

Les vues GitHub ne doivent être activées que lorsque l'API, les autorisations, l'interface et les tests sont prêts.
