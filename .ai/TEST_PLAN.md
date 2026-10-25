# 🧪 PLAN DE TESTS (APPROCHE E2E — AGENT 2)

## Stratégie
Le sandbox n'exécute pas de suite de tests automatisée dédiée (pas de runner configuré dans le scaffold).
La validation E2E est réalisée par : vérification lint (`bun run lint`) + vérification serveur (`dev.log`) + **vérification navigateur réelle (Agent Browser)** du golden path de chaque feature + captures des états.

## Matrice par feature (à remplir à chaque FEATURE-XXX)
| ID Feature | Scénario E2E (Gherkin) | Étapes | Résultat attendu | Exécuté le | Verdict |
|---|---|---|---|---|---|

## Smoke tests récurrents (à chaque livraison)
| # | Test | Attendu | Dernier résultat |
|---|---|---|---|
| S1 | `GET /` | HTTP 200 + page rendue | ✅ 200 (2026-10-25) |
| S2 | `GET /api` | HTTP 200 + `{"message":"Hello, world!"}` | ✅ 200 (2026-10-25) |
| S3 | `bun run lint` | 0 erreur | ✅ (2026-10-25) |
| S4 | dev.log sans erreur runtime | Aucun stacktrace | ✅ (2026-10-25) |
