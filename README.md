# DevOS — Assistant vocal proactif et rappels intelligents

Application web (sandbox Next.js 16) du module **Assistant vocal proactif** de DevOS : annonces vocales des nouvelles tâches, échéances approchantes et priorités, avec heures silencieuses, mode discret et planificateur **indépendant de l'IA** (rappels garantis par messages préparés).

## Démarrage

```bash
bun install
bun run db:push     # synchronise le schéma Prisma (SQLite)
bun scripts/seed.ts # (optionnel) 3 tâches de démonstration
bun run dev         # serveur de développement — http://localhost:3000
bun run lint        # ESLint
```

## Stack

Next.js 16 (App Router) · TypeScript 5 strict · Tailwind CSS 4 + shadcn/ui · Prisma 6 + SQLite · Zod 4 · Web Speech API (TTS local) · Web Notifications API · LLM z-ai-web-dev-sdk (reformulation serveur optionnelle, fallback templates — ADR-002).

## Structure

```
src/app/                 page unique « / » (3 onglets : Assistant · Tâches · Paramètres)
src/app/api/             health · voice-preferences · tasks · assistant/{tick,snooze,test-voice}
src/components/assistant/  UI (panneau assistant, gestion des tâches, réglages)
src/hooks/use-voice-assistant.ts   cœur client : tick 30 s, voix, notifications, journal
src/lib/assistant/       templates de messages · heures silencieuses · scheduler (état dérivé) · ai.ts
prisma/schema.prisma     Task · VoicePreferences · ReminderLog (+ User/Post scaffold)
.ai/                     gouvernance multi-agents (exigences, ADR, contrats API, audits, journaux)
```

## Principes produit

1. **Intégrité des données** : l'IA reformule les messages, ne modifie jamais les faits (priorité, échéance, statut).
2. **Fiabilité > IA** : les rappels fonctionnent même si le LLM est indisponible (templates serveur, AC-012).
3. **Zéro rattrapage** : une annonce manquée (silencieux, suspension, délai dépassé) est marquée expirée, jamais rejouée en rafale.
4. **Honnêteté plateforme** : l'arrière-plan natif Android/Linux est documenté (ADR-001), non simulé.

## Fuseau horaire

Le serveur raisonne en UTC ; le fuseau produit est **Africa/Abidjan (UTC+0 constant)** — l'heure serveur égale l'heure locale.
