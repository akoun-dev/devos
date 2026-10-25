# HANDOFF : TECH LEAD → ÉQUIPE

## 2026-10-25 — Initialisation
**Instruction** : bootstrap gouvernance uniquement. AUCUNE modification de code applicatif tant que les premières exigences CTO ne sont pas reçues.
**Découpage** : TASK-001 à TASK-004 (cf. TASKS.md).
**Contrats API** : aucun nouveau contrat — en attente Phase 2 d'une première feature.
**Rappels de conformité** : séparation des couches (ARCHITECTURE.md §2), API-FIRST, composants shadcn existants, pas de bleu/indigo, responsive + footer sticky.

## 2026-10-25 — Mission FEATURE-001 (DevOS : Assistant vocal proactif) — ⚠️ VERROUILLÉE JUSQU'AU « GO »
**Produit** : module Assistant vocal proactif et rappels intelligents de DevOS — exigences complètes dans `.ai/REQUIREMENTS.md` (FR-001→010, AC-001→012).
**Répartition officielle** : `.ai/SPECS/FEATURE-001-PLAN.md` (Task IDs 10-a→21, owners, jalons M1→M7, parallélismes).
**Règles d'or pour tous** :
1. L'IA reformule les messages, ne modifie JAMAIS les données DevOS (priorité/échéance/statut) — fallback templates obligatoire (AC-012).
2. ReminderScheduler INDÉPENDANT du moteur IA (ADR-002).
3. Honnêteté plateforme : arrière-plan Android/Linux = documentation cible uniquement, aucune simulation (ADR-001, §5 REQUIREMENTS).
4. Aucun développement avant le signal « GO » explicite du CTO.
