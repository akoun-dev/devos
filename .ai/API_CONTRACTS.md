# 📡 CONTRATS D'API (API-FIRST)

> **Dernière mise à jour** : 2026-10-25 (UTC) · **RÈGLE** : aucun code frontend ne consomme un endpoint absent de ce fichier.

## Format de contrat obligatoire

```yaml
[METHOD] /api/<route>
Description: <rôle fonctionnel>
Auth: <none | session | role:X>
Request:
  <DTO d'entrée validé par Zod — champs, types, contraintes>
Response 200:
  <DTO de sortie>
Erreurs:
  400: { error: string }  # payload invalide
  401 | 403 | 404 | 500: { error: string }
```

---

## ✅ Contrats en production

### `GET /api` — Endpoint de santé (démo scaffold)
- **Description** : ping applicatif.
- **Auth** : none
- **Request** : —
- **Response 200** : `{ "message": "string" }` → actuellement `"Hello, world!"`
- **Erreurs** : —
- **Implémentation** : `src/app/api/route.ts`
- **Note Audit** : endpoint scaffold sans valeur métier — à remplacer par `/api/health` structuré lors de la 1ère feature (cf. DEBT-002).

---

## 📝 Contrats en cours de conception
*(aucun — en attente des premières exigences du CTO)*

## 🗄️ Contrats archivés
*(aucun)*

## Journal des modifications
- 2026-10-25 : Création ; recensement de l'unique endpoint existant (`GET /api`).
