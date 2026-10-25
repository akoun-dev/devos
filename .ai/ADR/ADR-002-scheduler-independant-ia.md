# ADR-002 — ReminderScheduler indépendant du moteur IA
> **Statut** : ACCEPTÉ · **Date** : 2026-10-25 · **Décideur** : Tech Lead · **Task** : 10-b

## Contexte
FR-008/AC-012 : un rappel planifié doit se déclencher (notification + voix) **même si le modèle d'IA (Gemma cible / LLM sandbox) est arrêté, occupé ou indisponible**. La fiabilité des rappels prime sur la formulation IA.

## Décision
1. **L'IA n'est JAMAIS dans le chemin critique du déclenchement.** Le message est TOUJOURS produit d'abord par des **templates serveur** (`src/lib/assistant/templates.ts`), adaptés au style (naturel/professionnel/bref) et au mode discret.
2. La reformulation LLM (z-ai-web-dev-sdk, serveur uniquement) est **optionnelle et décorative** : elle reçoit le message template + les faits stricts, avec consigne « reformule, n'invente rien, ≤ 2 phrases ». Timeout implicite + try/catch → **tout échec retombe sur le template** (réponse `messageSource: "template"`).
3. Architecture « **état dérivé** » : il n'existe **aucune file de rappels persistante à recalculer**. À chaque tick, le serveur recalcule les candidats depuis `Task` + `VoicePreferences` ; les `ReminderLog` (contrainte d'unicité `taskId+type+scheduledFor`) servent uniquement de **mémoire anti-doublons/anti-rattrapage**. Toute modification/terminaison/annulation de tâche est donc prise en compte **automatiquement au tick suivant** (AC-007 par conception).

## Conséquences
- ✅ Arrêt du LLM ⇒ zéro impact sur rappels (AC-012 prouvable par test : LLM désactivé → annonces template).
- ✅ Recalcul trivial (aucune invalidation de file à bugger).
- ⚠️ Tick obligatoire (30 s côté client sandbox) → latence max ~30 s, acceptable et documentée.
- ⚠️ La qualité stylistique dépend des templates par défaut ; l'IA n'améliore que si disponible.
