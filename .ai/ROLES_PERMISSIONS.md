# 👥 RÔLES & PERMISSIONS — DevOS (FEATURE-UI-SHELL)

> Source : exigence CTO 2026-10-26 (cahier des charges interface). Mise en œuvre : registre central `src/lib/permissions.ts` + `src/lib/navigation.ts`. Vérification **côté backend** pour les ressources distantes (scopage userId systématique) et côté application pour les actions locales. **Masquer un menu n'est pas une mesure de sécurité.**

## 1. Rôles

| Rôle | Description |
|---|---|
| Propriétaire | Contrôle complet de l'espace, des comptes, des intégrations et de la sécurité |
| Administrateur | Gère la configuration et les utilisateurs autorisés, sans les secrets du propriétaire |
| Développeur | Gère projets, tâches, documents et outils de développement selon permissions attribuées |
| Collaborateur | Consulte et modifie les projets/tâches qui lui sont accessibles |
| Lecteur | Consulte les informations autorisées sans les modifier |
| Assistant IA | Identité technique non humaine, uniquement les permissions d'outils explicitement accordées |

**v1 (usage strictement personnel)** : tout compte authentifié est **Propriétaire** de son espace (`role: 'proprietaire'` par défaut). Les autres rôles sont définis dans le registre pour l'évolution multi-utilisateurs (sans implémentation backend dans cette itération).

## 2. Matrice des permissions (référence)

Légende : Complet = accès complet dans le périmètre autorisé ; Limité = permissions attribuées ; Lecture = consultation uniquement ; Non = pas d'accès.

| Fonction | Propriétaire | Administrateur | Développeur | Collaborateur | Lecteur | Assistant IA |
|---|---|---|---|---|---|---|
| Tableau de bord | Complet | Complet | Complet | Limité | Lecture | Selon autorisation |
| Projets | Complet | Complet | Limité | Limité | Lecture | Selon autorisation |
| Tâches | Complet | Complet | Limité | Limité | Lecture | Selon autorisation |
| Documents | Complet | Complet | Limité | Limité | Lecture | Selon autorisation |
| Git local | Complet | Limité | Limité | Non par défaut | Lecture autorisée | Outils autorisés |
| GitHub | Complet | Limité | Limité | Non par défaut | Lecture autorisée | Outils autorisés |
| Assistant IA | Complet | Complet | Complet | Complet | Complet | Sans objet |
| Assistant vocal | Complet | Complet | Complet | Complet | Selon permission | Sans objet |
| Automatisations | Complet | Limité | Limité | Non par défaut | Lecture | Exécution autorisée uniquement |
| Journal d'activité | Complet | Limité | Limité | Limité | Lecture limitée | Journalisation contrôlée |
| Synchronisation | Complet | Limité | État uniquement | État uniquement | Lecture | Pas d'administration |
| Sauvegardes | Complet | Selon permission | Non par défaut | Non | Non | Pas d'accès direct |
| Utilisateurs et rôles | Complet | Limité | Non | Non | Non | Non |
| Secrets et clés API | Complet | Selon politique | Non par défaut | Non | Non | Jamais directement |
| Paramètres système | Complet | Limité | Préférences autorisées | Préférences personnelles | Préférences personnelles | Non |

## 3. Capacités de l'assistant IA (non-administrateur)

| Capacité IA | Niveau recommandé |
|---|---|
| Lire les projets sélectionnés | Autorisé |
| Lire les tâches et échéances | Autorisé |
| Rechercher dans les documents autorisés | Autorisé |
| Créer une tâche | Autorisé si activé |
| Modifier une échéance | Confirmation ou règle explicite |
| Archiver ou supprimer un projet | Confirmation |
| Lire les dépôts autorisés | Autorisé |
| Modifier des fichiers | Accès limité à des répertoires autorisés |
| Exécuter une commande système | Liste blanche et validation |
| Publier sur GitHub | Confirmation explicite |
| Déployer en production | Confirmation renforcée |
| Lire des secrets | **Interdit par défaut** |
| Modifier les rôles et permissions | **Interdit** |

**Mise en œuvre v1** : l'Assistant IA (`/api/ai/chat`) n'a **aucun accès outillé** au données (lecture/écriture) — il ne voit que ce que l'utilisateur colle dans la conversation. Les capacités ci-dessus seront activées une par une avec confirmation côté UI et vérification côté backend (backlog FEATURES-IA).

## 4. Permissions complémentaires à contrôler (évolution)

Droits par projet · droits par dépôt · chemins locaux autorisés · intégrations connectées · permissions micro · actions de l'assistant vocal · opérations nécessitant confirmation · permissions par appareil.
