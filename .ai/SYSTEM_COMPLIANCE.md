# ⚖️ CONFORMITÉ DU SYSTÈME AUX RÈGLES (SYSTEM COMPLIANCE)

> **Dernière mise à jour** : 2026-10-25 (UTC) · **Responsable** : AGENT AUDIT GLOBAL · **Source** : AUDIT GLOBAL #001 (baseline)
> **Contexte** : scaffold vierge, 0 feature métier. Beaucoup de règles seront « N-A (aucun code métier) » — c'est assumé et honnête ; elles deviennent applicables dès la première feature.

## Score global de conformité

| Métrique | Valeur |
|---|---|
| **Score global** | **58 %** (sur les 12 règles applicables au stade scaffold) |
| Calcul | RESPECTÉ = 1 pt (×6), PARTIEL = 0,5 pt (×2), NON RESPECTÉ = 0 pt (×3) → 7 / 12 ≈ 58 % ; les 4 règles N-A sont exclues du calcul |
| Répartition | 6 RESPECTÉES · 2 PARTIELLES · 3 NON RESPECTÉES · 4 N-A (sur 15 règles auditées) |
| Seuil système | Pas de seuil formel au stade baseline ; les 3 non-respects ont un plan d'action daté (cf. AUDIT-001 §9) |

## Checklist des règles

| # | Règle | Verdict | Preuve (2026-10-25) | Plan d'action si non respecté |
|---|---|---|---|---|
| 1 | **RÈGLE D'INTÉGRITÉ** (statuts prouvables, worklog append-only, pas de falsification) | ✅ RESPECTÉ | `worklog.md` : 2 entrées antérieures intactes, style preuves (« Lecture de package.json… », « GET / 200 ») ; `PROJECT_CONTEXT.md` avec colonne « Preuve » ; `TASKS.xlsx` parse openpyxl = 5 tâches cohérentes avec `TASKS.md:7-13`. Réserve mineure : 2 inexactitudes de chiffres dans la doc (27 règles ESLint vs « ~25 » ; « strict » vs `noImplicitAny:false`) — corrigées par AUDIT-001 | — (réserve suivie en C1/C2 de l'AUDIT-001) |
| 2 | **API-FIRST** (contrat avant code frontend) | ✅ RESPECTÉ (au stade actuel) | `API_CONTRACTS.md` recense l'unique endpoint existant avec le format contractuel exigé ; `curl -s http://localhost:3000/api` → `{"message":"Hello, world!"}` = contrat conforme au code (`src/app/api/route.ts:3-5`) ; aucun frontend ne consomme d'API non recensée (aucun fetch dans `src/`) | — (appliquer strictement dès la 1re feature) |
| 3 | **SÉPARATION DES COUCHES** (UI / hooks / services / data / API) | ✅ RESPECTÉ (triviallement, 0 métier) | Règle documentée (`ARCHITECTURE.md` §2) ; aucun composant n'importe `src/lib/db.ts` (lecture de `page.tsx`, `layout.tsx`, `hooks/*`) ; le seul consommateur potentiel serait l'API. Couche services non créée (annoncée « à créer ») | — (vigilance à la 1re feature : créer `src/lib/services/**`) |
| 4 | **NON-DUPLICATION** (réutilisation shadcn/ui, utils partagés) | ✅ RESPECTÉ (N-A partiel) | ~50 composants shadcn/ui dans `src/components/ui/` disponibles et non recopiés ; `cn()` partagé (`src/lib/utils.ts`) ; aucune logique dupliquée détectable (code minimal) | — |
| 5 | **COMMITS CONVENTIONNELS** (feat/fix/chore/docs + COMMIT_LOG) | ❌ NON RESPECTÉ | `git log --oneline` = 1 seul commit `09c67ac Initial commit` (non conventionnel) ; `git status --short` = `.gitignore` modifié + 19 entrées non suivies (`.ai/`, `src/`, `prisma/`, `worklog.md`, …) ; `COMMIT_LOG.md` = 10 lignes, aucune entrée | Session de commits atomiques conventionnels à J+1 (action #2 AUDIT-001) puis tenue systématique du journal — DEBT-014 |
| 6 | **ATOMICITÉ** (1 commit = 1 unité cohérente) | ⬜ N-A (aucun commit de feature) | Aucun commit depuis l'initialisation ; rien à évaluer | S'appliquera dès les premiers commits (cf. règle 5) |
| 7 | **REVUE DE CODE** (REVIEW_LOG, verdict avant clôture) | ❌ NON RESPECTÉ (en retard) | Review status TASK-002 et TASK-003 = « EN COURS (demandée à Reviewer) » (parse TASKS.xlsx colonne Q) ; `REVIEW_LOG.md` = 5 lignes, aucune entrée REV-XXX | Revue du bootstrap gouvernance par l'AGENT REVIEWER avant TASK-005 (action #3 AUDIT-001) |
| 8 | **DOCUMENTATION** (docs synchronisées, CHANGELOG, PROJECT_CONTEXT) | ✅ RESPECTÉ (avec réserve) | 34 fichiers `.ai/` présents et remplis (wc -l 4-76 lignes) ; `CHANGELOG.md` tenu ([0.2.1-bootstrap] 2026-10-25) ; cohérence doc↔code vérifiée (AUDIT-001 §7 : 6/6 points clés conformes). Réserve : README racine absent (DEBT-009), 2 inexactitudes mineures (C1/C2) | Créer README racine à J+1 ; corriger C1/C2 à J+2 |
| 9 | **ADR** (decision records pour choix majeurs) | ⬜ N-A (aucune décision majeure) | `ADR/TEMPLATE.md` prêt (16 lignes) ; table ADR vide dans `ARCHITECTURE.md` §6 — cohérent avec le stade scaffold | Enregistrer un ADR pour chaque décision d'architecture dès la conception de la 1re feature |
| 10 | **ACCESSIBILITÉ** (WCAG 2.1 AA : guide, registre, validations) | 🟡 PARTIEL | `ACCESSIBILITY_GUIDE.md` (52 lignes, WCAG 2.1 AA) + `A11Y_BUGS.md` prêts ; `lang="en"` (`layout.tsx:44`), `alt` présent (`page.tsx:21`), thème neutre contrasté. MAIS : h1 manquant sur `/` (`page.tsx:4-30`, DEBT-011) ; aucune validation outillée (clavier/lecteur d'écran) réalisée | Corriger h1 à la 1re feature UI ; exécuter la checklist a11y du guide à chaque écran livré |
| 11 | **PERFORMANCE** (budgets définis et respectés) | ✅ RESPECTÉ | `PERFORMANCE_BUDGET.md` (budgets LCP/INP/CLS/TTFB + règles) ; mesure à chaud : TTFB 26,6 ms / Total 27,8 ms (`curl -w`, 2026-10-25) ≪ budget 800 ms ; `dev.log` : `GET / 200 in 24-37ms`. Réserve : `<img>` vs `next/image` (DEBT-015) | — (surveiller à chaque feature : mesure dans `PERF_ISSUES.md` si dépassement) |
| 12 | **SÉCURITÉ** (surface minimale, secrets protégés, headers, audit deps) | 🟡 PARTIEL | Surface d'attaque minimale : 1 endpoint public sans donnée/mutation (`src/app/api/route.ts`) ; `.env` = 1 seule clé `DATABASE_URL` (valeur non exposée dans les rapports) ; aucune auth/entrée utilisateur ; `SECURITY_AUDIT.md` + `SEC_BUGS.md` prêts. MAIS : aucun header de sécurité + `X-Powered-By` exposé (`curl -sI`), `reactStrictMode: false`, pas de scan deps automatisé (`bun pm ls` manuel uniquement) | Headers + `poweredByHeader: false` à la 1re feature (DEBT-013) ; `bun audit`/équivalent à intégrer au workflow |
| 13 | **TESTS** (tests automatisés, plan E2E, non-régression) | ❌ NON RESPECTÉ | Aucun runner ni test automatisé (`package.json:5-14` sans script `test` ; aucun `*.test.*`) ; `tests/` = 3 scripts shell d'infra runtime, pas des tests applicatifs ; seuls smoke S1-S4 manuels passent (`TEST_PLAN.md:11-15` — re-joués OK par l'audit) | Introduire Vitest + Playwright dès la 1re feature (DEBT-010) ; matrice par feature de `TEST_PLAN.md` à remplir systématiquement |
| 14 | **RGPD** (données personnelles minimisées, consentement) | ⬜ N-A (aucune donnée personnelle traitée) | Modèles démo User (email) non exposés par aucune route ; aucune écriture DB ; aucune donnée réelle | S'appliquera dès qu'un modèle contiendra des données personnelles : minimisation, mention légale, droit d'accès/suppression à prévoir dans les features concernées |
| 15 | **LICENCES** (vérification licences dépendances, conformité) | ⬜ N-A (aucune licence vérifiée formellement) | Dépendances standard écosystème JS (MIT/ISC majoritairement : Radix, TanStack, etc. — `package.json`/`bun.lock`) ; SDK privé `z-ai-web-dev-sdk` fourni par la plateforme (usage plateforme) ; pas de Redistribution en dehors de la plateforme à ce stade | Vérification formelle des licences (`bun pm ls` + licences) avant toute distribution/packaging hors plateforme |

## Synthèse et trajectoire

- **Ce qui tient déjà** : intégrité documentaire, API-FIRST, séparation des couches, réutilisation, budgets de performance, dispositif a11y/sécurité documenté — la gouvernance est réelle, pas décorative (preuves citées ligne à ligne).
- **Ce qui doit être rattrapé (3 non-respects)** : commits conventionnels + revue de code + tests automatisés. Les trois sont liés à la même cause : le bootstrap vient de s'achever sans passer par le cycle COMMIT → REVIEW. **Deadline : J+1 pour commits/revue, 1re feature pour les tests.**
- **Ce qui deviendra applicable** : ADR, RGPD, licences, et la charge réelle d'API-FIRST/a11y/perf/sécurité sur le premier code métier.
- **Prochaine revue de conformité** : AUDIT-002 (après 5 features ou sur demande) — recalcul complet de ce score.
