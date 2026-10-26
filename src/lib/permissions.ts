/**
 * permissions.ts — permissions centralisées du shell DevOS (FEATURE-UI-SHELL).
 *
 * Source de vérité produit : .ai/ROLES_PERMISSIONS.md (matrice CTO 2026-10-26).
 * RÈGLE : le masquage de menu n'est PAS une mesure de sécurité — chaque endpoint
 * backend re-vérifie la session et le scopage utilisateur (cf. ADR-004).
 *
 * v1 (usage strictement personnel) : tout compte authentifié est `proprietaire`.
 * La matrice complète est déclarée ici pour l'évolution multi-utilisateurs.
 */

import type { Role, ViewId } from '@/types/workspace'

/** Rôle effectif d'un utilisateur connecté en v1. */
export const DEFAULT_ROLE: Role = 'proprietaire'

/**
 * Vues accessibles par rôle (vue absente => inaccessible).
 * Lecture de la matrice produit :
 *  - proprietaire : tout ;
 *  - lecteur : consultation uniquement (dashboard, projets, tâches, documents, IA) ;
 *  - assistant_ia : selon autorisation (aucune vue système, aucun journal complet).
 */
const VIEW_ROLES: Record<ViewId, Role[]> = {
  // Espace de travail
  dashboard: ['proprietaire', 'administrateur', 'developpeur', 'collaborateur', 'lecteur'],
  projects: ['proprietaire', 'administrateur', 'developpeur', 'collaborateur', 'lecteur'],
  tasks: ['proprietaire', 'administrateur', 'developpeur', 'collaborateur', 'lecteur'],
  planning: ['proprietaire', 'administrateur', 'developpeur', 'collaborateur', 'lecteur'],
  notes: ['proprietaire', 'administrateur', 'developpeur', 'collaborateur', 'lecteur'],
  // Intelligence artificielle
  'ai-chat': ['proprietaire', 'administrateur', 'developpeur', 'collaborateur', 'lecteur'],
  voice: ['proprietaire', 'administrateur', 'developpeur', 'collaborateur'],
  automations: ['proprietaire', 'administrateur', 'developpeur'],
  // Développement
  git: ['proprietaire', 'administrateur', 'developpeur'],
  github: ['proprietaire', 'administrateur', 'developpeur'],
  terminal: ['proprietaire', 'administrateur', 'developpeur'],
  activity: ['proprietaire', 'administrateur', 'developpeur', 'collaborateur'],
  // Système
  notifications: ['proprietaire', 'administrateur', 'developpeur', 'collaborateur'],
  sync: ['proprietaire', 'administrateur', 'developpeur', 'collaborateur', 'lecteur'],
  storage: ['proprietaire'],
  settings: ['proprietaire', 'administrateur', 'developpeur', 'collaborateur', 'lecteur'],
}

/** Une vue est accessible si son statut est actif ET le rôle est autorisé. */
export function canAccessView(viewId: ViewId, role: Role, active: boolean): boolean {
  if (!active) return false
  return VIEW_ROLES[viewId]?.includes(role) ?? false
}
