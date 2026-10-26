# FEATURE-021 — Vues améliorées et import GitHub par token

- Statut : CONCEPTION
- Priorité : P1

## Objectif
Améliorer les vues de travail DevOS et permettre de récupérer/importer des dépôts GitHub uniquement après présentation d'un token valide par l'utilisateur.

## Contraintes non négociables
- Aucune récupération anonyme de dépôts : le listing et la recherche de dépôts nécessitent un token fourni.
- Le token n'est jamais intégré au code source, aux variables publiques, à l'URL, à la base de données ou aux logs.
- Le token transite dans le corps d'une requête POST HTTPS vers le backend, puis est utilisé dans l'en-tête Authorization pour l'API GitHub.
- Aucune persistance du token dans cette feature ; mémoire client uniquement, suppression au rechargement/déconnexion.
- L'utilisateur choisit le dépôt et confirme l'import.
- Les données de projet importées sont liées au compte DevOS authentifié.
- La navigation mobile reste un tiroir, sans menu compact ou barre inférieure.

## Critères d'acceptation
- AC-021-01 : dashboard avec priorités, retards, échéances et projets actifs issus des données réelles.
- AC-021-02 : aucune barre de navigation inférieure sur mobile.
- AC-021-03 : aucune requête de listing GitHub avant soumission du token.
- AC-021-04 : token invalide traité sans divulguer sa valeur.
- AC-021-05 : seuls les dépôts accessibles à l'identité du token sont retournés.
- AC-021-06 : les dépôts privés nécessitent les permissions GitHub appropriées.
- AC-021-07 : token absent de SQLite/Prisma, localStorage, sessionStorage, logs et réponses.
- AC-021-08 : recherche/filtrage/sélection disponibles avant confirmation d'import.
- AC-021-09 : le projet local conserve l'identifiant et l'URL du dépôt, jamais le token.
- AC-021-10 : routes protégées par la session DevOS et données limitées à l'utilisateur courant.
- AC-021-11 : états loading, empty, unauthorized, rate-limit et erreur serveur accessibles et testés.
- AC-021-12 : lint, vérification TypeScript, tests API et tests E2E desktop/mobile requis.

## Hors périmètre
- Clone serveur, terminal et exécution de commandes.
- Push, merge, création d'issues/PR ou déploiement.
- Stockage persistant du token.
- Import automatique sans confirmation.
