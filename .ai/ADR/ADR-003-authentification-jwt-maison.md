# ADR-003 — Authentification maison JWT/bcrypt + scopage multi-utilisateurs (next-auth proscrit)

- **Statut** : ACCEPTÉ
- **Date** : 2026-10-25
- **Décideur** : ORCHESTRATEUR PRINCIPAL (CTO), exécution Task ID 22 (FEATURE-AUTH)
- **Contexte / Problème** :
  - Exigence CTO : « Ajoute un système auth ». Le produit DevOS est mono-utilisateur implicite (préférences singleton `id="default"`, tâches globales, scheduler sans notion de propriétaire).
  - Contrainte forte : **next-auth est PROSCRIT** — retiré en DEBT-016 (CVE CRITIQUE GHSA-7rqj-j65f-68wh sur next-auth@4.24.x ; dépendance 0 fois importée). Le réintroduire rouvrirait une condition de prod refermée par l'AUDIT-002.
  - Exigence d'intégrité : une auth « portail » sur des données partagées serait factuellement trompeuse — les données DEVRAIENT être scopées par utilisateur.
  - Environnement : Next.js 16 App Router, Prisma 6/SQLite, aucun middleware (posture sécurité AUDIT-002 : surface d'attaque next maintenue à zéro pour les CVE next conditionnées au middleware/Server Actions).

- **Options considérées** :
  1. **next-auth v4 (credentials + JWT)** — inconvénient rédhibitoire : CVE critique connue, vient d'être retiré (DEBT-016) ; configuration lourde pour un usage credentials pur.
  2. **Auth.js v5** — en bêta longuement instable à l'époque du choix, dépendance externe non auditée ici, couplage fort au framework d'auth pour 4 endpoints simples.
  3. **Session maison : bcryptjs + JWT HS256 (`jose`) + cookie httpOnly, contrôle d'accès par route** — dépendances minimales auditables, code explicite (~120 lignes), aucun middleware ; requiert rigueur manuelle (flags cookie, égalisation temporelle, invalidation).
  4. Auth maison avec sessions DB (table Session) — invalidation serveur plus fine mais complexité + requêtes DB supplémentaires à chaque requête sans bénéfice immédiat (TTL court suffisant).

- **Décision** :
  - Option 3 : **session JWT maison** — `POST /api/auth/register|login|logout`, `GET /api/auth/me` ; mot de passe bcrypt (coût 10) ; JWT HS256 signé `jose` (subject = user id, TTL 7 j, secret `JWT_SECRET` ≥ 32 caractères en `.env` jamais commité) ; cookie `devos_session` httpOnly + SameSite=Lax + Secure en production ; message d'échec de connexion générique + égalisation temporelle bcrypt (hash factice précalculé) ; **scopage multi-utilisateurs intégral** : `User.passwordHash`, `Task.userId` (requis, index, Cascade), `VoicePreferences.userId` (unique, Cascade — le singleton `"default"` disparaît), `scheduler.runTick(now, userId)` strictement par utilisateur (anti-frénésie incluse) ; tout endpoint métier renvoie 401 `{ error: "Authentification requise" }` sans session.
  - Frontend : `AuthGate` (page unique `/`) — écran d'attente → formulaire Connexion/Inscription → DevOSApp avec chip identité + déconnexion ; toute réponse 401 métier déclenche l'expiration de session côté client ; le miroir localStorage des préférences est purgé à chaque transition d'authentification.
  - Aucun middleware : contrôle d'accès effectué route par route via `getSessionUser()` (lib/auth, serveur uniquement).

- **Conséquences** :
  - ✅ Positives : dépendances minimales (bcryptjs 3.0.3, jose 6.2.13 — 0 advisory direct) ; jeton illisible et inaltérable côté client (httpOnly) ; données strictement isolées par utilisateur (preuves curl : Bob → 404 sur tâche/log d'Alice, liste vide) ; scheduler inchangé dans sa logique pure (computeTick) — scoping en couche orchestration ; surface next middleware toujours nulle.
  - ⚠️ Trade-offs : pas d'invalidation serveur immédiate (révocation = TTL 7 j — mitigation : secret rotation possible ; revocation list = évolution future) ; pas de rate limiting sur /api/auth/* (→ DEBT-021, durcissement avant exposition réseau réelle) ; miroir localStorage des préférences reste « par appareil » (purgé aux transitions d'auth — risque résiduel de lecture par un compte suivant sur le même navigateur si le serveur devient injoignable) ; le tick est piloté par la session (cohérent avec l'architecture « état dérivé » client-driven d'ADR-002 — un utilisateur déconnecté ne génère pas de ticks).
  - Migration de données : purge des 3 tâches seed + 8 logs + 1 prefs « default » (0 utilisateur existant, 0 donnée réelle perdue — conforme DEBT-020 : base vierge avant prod).

- **Références** : `.ai/API_CONTRACTS.md` § v1.1 (AUTHORITATIF) · `.ai/DEBT_REPORT.md` DEBT-016 (proscription next-auth), DEBT-021 (rate limiting) · `.ai/AUDITS/AUDIT-002-2026-10-25.md` (posture middleware) · preuves E2E Task 22 (18 tests curl + parcours navigateur agent-browser) dans `worklog.md`
