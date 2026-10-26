# FEATURE-021 — Spécification UX/UI

- Statut : CONCEPTION
- Branche de travail : main (selon la consigne du propriétaire)
- Références : .ai/DESIGN_SYSTEM.md, .ai/ADR/ADR-004-shell-navigation-permissions.md

## Objectifs
- Rendre le tableau de bord actionnable, avec une hiérarchie claire.
- Simplifier la lecture des projets et tâches sans créer de vues redondantes.
- Donner à GitHub une vue dédiée à la connexion par token, à la liste des dépôts autorisés et à leur import explicite.
- Conserver la navigation desktop et le tiroir mobile existants. Ne pas créer de barre de navigation inférieure ni de menu mobile compact.

## Direction visuelle
- Réutiliser les tokens du design system et les composants shadcn/ui existants.
- Palette neutre, surfaces sobres, accent réservé aux actions et à la sélection active ; pas de bleu/indigo imposé.
- Typographie hiérarchisée, espacement cohérent, états visuels explicites et focus visible.
- Cartes peu décoratives, bordures discrètes, actions principales identifiables, cibles tactiles d'au moins 44 px.
- Responsive mobile-first, sans changer le modèle de navigation demandé.

## Vues proposées

### Tableau de bord
- En-tête avec date, contexte court et action « Nouvelle tâche ».
- Indicateurs : tâches ouvertes, tâches en retard, échéances proches, projets actifs.
- Zone principale desktop en deux colonnes : « Ma journée » et « Projets actifs ».
- « À surveiller » : tâches urgentes et échéances prochaines, uniquement à partir des données réelles.
- Activité récente et état de synchronisation/assistant en zone secondaire.
- Mobile : indicateurs en grille 2 colonnes puis sections empilées ; aucune barre de navigation inférieure.

### Projets
- En-tête avec recherche, filtres Tous / Favoris / En pause / Terminés / Archivés et actions Créer / Importer depuis GitHub.
- Liste par défaut ; grille facultative uniquement si elle réutilise les mêmes données et filtres.
- Chaque projet montre nom, statut, priorité, progression réelle, échéance et nombre de tâches.
- Détail en sections : Résumé, Tâches, Notes, Dépôt lié, Activité.
- Création manuelle et import GitHub restent deux parcours distincts.

### GitHub — connecter et importer
- État initial : explication et champ token masqué ; aucun listing de dépôts avant soumission.
- Vérification : état de chargement et résultat du compte, sans jamais afficher le token.
- Dépôts autorisés : recherche locale, filtres privé/public/archivé, tri et pagination si nécessaire.
- Aperçu : propriétaire, nom, description, branche par défaut et métadonnées disponibles.
- Import : sélectionner un dépôt, vérifier les détails, confirmer, puis créer/associer le projet local.
- Erreurs compréhensibles pour token invalide, permission insuffisante, rate limit et indisponibilité.

### Paramètres GitHub
- Champ token masqué, révélation temporaire facultative et accessible.
- Token en mémoire uniquement ; effacé à la déconnexion ou au rechargement.
- Ne pas stocker en base, localStorage, sessionStorage, cookies non sécurisés, logs ou messages d'erreur.
- Bouton pour effacer le token et mention explicite « Non enregistré ».
- Une éventuelle persistance sécurisée fera l'objet d'une conception séparée.

## Navigation et accessibilité
- La navigation continue à être pilotée par le registre central existant.
- Ne pas introduire BottomNav, MOBILE_PRIMARY_ITEMS ou équivalent.
- Labels explicites, erreurs liées aux champs, focus visible, annonces des chargements.
- Ne jamais importer automatiquement un dépôt sans confirmation de l'utilisateur.
