# 🎓 LEÇONS APPRISES (capitalisation)

Format : Date | Origine (feature/bug/audit/incident) | Leçon | Action concrète en découlant

- 2026-10-25 | Bootstrap | Un scaffold vierge contient déjà de la dette implicite (ESLint permissif, ignoreBuildErrors, relation Prisma non déclarée) | Constat tracé dans DEBT_REPORT.md et à traiter dès la première feature
- 2026-10-26 | Incident (INC-001) | La restauration d'environnement ne réapprovisionne ni les variables d'env applicatives ni la base : `JWT_SECRET` perdu + `User` vide → 500 fail-fast (la garde env-only a protégé l'intégrité, 0 secret fuité) | `JWT_SECRET` + seed consignés au manifeste d'auto-sauvegarde ; `core.fileMode false` posé ; garde `auth.ts:36` maintenue telle quelle (comportement voulu)
