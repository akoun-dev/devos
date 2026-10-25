# 📋 EXIGENCES PRODUIT (REQUIREMENTS)

> **Dernière mise à jour** : 2026-10-25 (UTC) · **Responsable** : AGENT 2 (QA / Product Owner)
> **Source** : Contexte produit fourni par le CTO — module « Assistant vocal proactif et rappels intelligents » de **DevOS**
> **Statut** : ✅ CAPTURÉES · ⚠️ Adaptations plateforme requises (cf. §5 — aucune codée avant signal « GO »)

## 1. Produit : DevOS

DevOS est un assistant de développement personnel **proactif** : l'utilisateur ne doit pas avoir besoin d'ouvrir l'application pour être averti d'un événement pertinent. Le présent module intègre un assistant IA qui informe **vocalement** des nouvelles tâches, échéances approchantes et priorités importantes.

**Principe d'intégrité produit** : les messages vocaux restent fidèles aux données réellement enregistrées dans DevOS. L'IA ne doit JAMAIS inventer une échéance, une tâche ou un avancement, ni modifier arbitrairement une priorité. La fiabilité des rappels est PRIORITAIRE sur la génération de messages par l'IA.

## 2. Préférences initiales (valeurs par défaut — modifiables, non imposées)

| Paramètre | Valeur initiale |
|---|---|
| Assistant vocal | Activé |
| Délai de rappel avant une tâche | 1 heure avant |
| Annonce des nouvelles tâches | Activée |
| Annonce des échéances | Activée |
| Annonce des tâches prioritaires | Activée |
| Heures silencieuses | Activées |
| Style de communication | Naturel et conversationnel |
| Notifications système | Activées, sous réserve de l'autorisation de l'utilisateur |
| Synthèse vocale locale | Privilégiée lorsque disponible |

## 3. Exigences fonctionnelles

### FR-001 — Rappels vocaux anticipés
- Rappel vocal programmé (défaut : 1 h) avant l'heure prévue d'une tâche/événement.
- Délai global personnalisable (5/15/30 min, 1 h, personnalisé) + délai par tâche.
- Notification système en complément du message vocal.
- Actions : reporter le rappel · accéder directement à la tâche.
- Désactivation des rappels par tâche.
- **Aucune annonce en double** (rappel déjà traité ≠ re-annoncé).
- Exemple : « Bonjour ! Dans une heure, tu as prévu de finaliser le déploiement de ton projet. Pense à vérifier les tests avant la mise en production. »

### FR-002 — Annonce des nouvelles tâches
- Annonce vocale optionnelle à la création/détection d'une nouvelle tâche pertinente.
- Choix des catégories de tâches annoncées + anti-frénésie (éviter annonces trop fréquentes).
- Exemple : « Une nouvelle tâche vient d'être ajoutée à ton projet DevOS : vérifier la synchronisation entre ton ordinateur et ton téléphone. »

### FR-003 — Annonce des échéances
- Surveillance des échéances enregistrées selon les délais configurés, en tenant compte de : date/heure prévues, statut de la tâche, annulation/modification, fuseau horaire configuré, heures silencieuses, rappels déjà envoyés.
- **Une tâche terminée ou annulée ne déclenche plus de rappels.**

### FR-004 — Annonce des priorités
- Signalement des tâches urgentes/importantes. La priorité provient EXCLUSIVEMENT des données DevOS (l'IA peut reformuler, pas réévaluer).
- Exemple : « Petit rappel : la correction du problème de synchronisation est prioritaire aujourd'hui. »

### FR-005 — Style naturel et conversationnel
- Voix claire, naturelle, concise, adaptée à un assistant personnel professionnel.
- Ton conversationnel, pas de répétitions, nom du projet et de la tâche quand pertinent, **limitation des informations sensibles à voix haute**.
- Configurable : langue et voix disponibles sur l'appareil.
- **Synthèse vocale locale privilégiée** — un rappel déjà programmé doit pouvoir être prononcé **sans connexion Internet**.

### FR-006 — Écran de configuration « Paramètres → Assistant vocal »
Modifiable à tout moment :
1. Activation/désactivation globale de l'assistant vocal
2. Délai de rappel : 5 min / 15 min / 30 min / 1 h / personnalisé
3. Annonces : nouvelles tâches · échéances · priorités (indépendantes)
4. Heures silencieuses : heure début + fin + **jours concernés**
5. Style de communication : naturel / professionnel / très bref
6. Voix et langue (selon moteurs disponibles)
7. Volume de synthèse (dans les limites du système)
8. Catégories de tâches autorisées à déclencher une annonce
9. Préférences de confidentialité des annonces vocales
+ Bouton **« Tester la voix »** (exemple audible) + **« Suspendre les annonces »** (désactivation temporaire)
+ Paramètres **enregistrés localement** (accessibles hors ligne) ; si synchronisation activée → cohérence inter-appareils.

### FR-007 — Heures silencieuses
- Activées par défaut ; plage horaire configurable (ex. nuit, concentration) + jours.
- Pendant la plage : aucune annonce vocale ordinaire ; notifications visibles selon préférences système ; rappels différés selon règle configurable ; **les rappels obsolètes ne doivent PAS être lus en bloc à la fin de la période**.
- Les alertes urgentes ne contournent les heures silencieuses que si l'utilisateur active EXPLICITEMENT cette option.

### FR-008 — Fonctionnement en arrière-plan (cible plateforme)
- **Android** : déclenchement des rappels planifiés hors application (mécanismes adaptés : tâches planifiées, notifications, alarmes précises ; autorisations demandées et expliquées ; fonctionnement hors ligne ; prise en compte restrictions batterie/permissions).
- **Linux** : service local de rappels (session utilisateur active ; lancement configurable au démarrage ; indépendant de l'UI dans les limites de l'environnement).
- **IA locale** : le planificateur est INDÉPENDANT du moteur d'IA. Si le modèle (Gemma) est arrêté/indisponible/occupé, un rappel programmé déclenche quand même notification + annonce vocale à partir d'un **message préparé**. L'IA formule, elle n'est pas requise au déclenchement.

### FR-009 — Architecture technique (composants cibles)
`ReminderScheduler` (programme/recalcule) · `VoiceAssistantService` (coordonne les annonces) · `NotificationService` (notifications système) · `TextToSpeechProvider` (interface commune aux moteurs TTS) · `VoicePreferencesRepository` (préférences) · `EventListener` (créations/modifications/annulations/priorités) · `SyncIntegration` (recalcul après synchronisation) · `AIOrchestrator` (formulations naturelles quand utile).
> Stack cible déclarée : Flutter/Dart · SQLite via Drift · synchronisation Supabase · moteurs d'IA locaux (Gemma).

### FR-010 — Sécurité et confidentialité
Autorisations demandées explicitement et expliquées · limites de l'arrière-plan expliquées · **pas de microphone permanent** · pas d'informations confidentielles énoncées sans respect des préférences de confidentialité · pas de contournement des restrictions OS · **mode silencieux global immédiatement accessible** · préférences conservées hors ligne.

## 4. Critères de réception (AC-001 → AC-012)
| # | Critère |
|---|---|
| AC-001 | Assistant vocal activé par défaut |
| AC-002 | Tâche planifiée → rappel 1 h avant, sauf modification du délai ou règle silencieuse |
| AC-003 | Nouvelles tâches, échéances et priorités annoncées séparément |
| AC-004 | Messages prononcés dans un style naturel et conversationnel |
| AC-005 | Paramètres modifiables et **conservés après fermeture/réouverture** |
| AC-006 | Rappels déjà programmés fonctionnent **hors ligne** |
| AC-007 | Rappels recalculés quand une tâche change, est terminée ou annulée |
| AC-008 | Aucun rappel annoncé plusieurs fois par erreur |
| AC-009 | Heures silencieuses respectées |
| AC-010 | Permissions manquantes / restrictions système signalées clairement |
| AC-011 | Arrière-plan Android/Linux testé dans les conditions réellement autorisées |
| AC-012 | L'arrêt du modèle d'IA n'empêche pas l'exécution des rappels planifiés |

## 5. ⚠️ Analyse d'écart plateforme (obligation d'honnêteté — sandbox actuel)

L'environnement d'exécution du présent projet est un **sandbox web Next.js 16 (port 3000 unique)** — la stack cible déclarée (Flutter/Dart, Drift, Supabase, Gemma, arrière-plan Android/Linux) **n'est pas disponible ici**. Conformément à la RÈGLE D'INTÉGRITÉ ABSOLUE, voici la correspondance exacte de ce qui sera implémenté ici :

| Élément de la spec | Faisabilité sandbox | Adaptation proposée (équivalent) |
|---|---|---|
| Écran « Paramètres → Assistant vocal » (FR-006) | ✅ Complet | UI Next.js + shadcn/ui, persistance locale (localStorage) + serveur |
| ReminderScheduler (FR-001/003/007, anti-doublons, recalcul) | ✅ Complet | Planificateur applicatif (tick client + API serveur), fuseau Africa/Abidjan, gestion minuit |
| NotificationService (FR-001/010) | ⚠️ Équivalent | **Web Notifications API** avec `requestPermission()` explicite (autorisation utilisateur) |
| TextToSpeechProvider (FR-005) | ⚠️ Équivalent | Interface d'abstraction + implémentation **Web Speech API** (`speechSynthesis`, voix locales du navigateur, sans requête réseau) ; option serveur TTS pour la génération de tests |
| Arrière-plan Android/Linux (FR-008) | ❌ **Non réalisable/testable ici** | **Documenté, non simulé** : ADR décrivant l'implémentation cible (WorkManager/AlarmManager ; service systemd/session) — hors périmètre sandbox, sera marqué N/A aux tests avec justification |
| SQLite via Drift | ⚠️ Équivalent | **Prisma + SQLite** (ORM différent, même base locale) |
| Synchronisation Supabase (SyncIntegration) | ❌ Non disponible | Couche `SyncIntegration` simulée en local (API interne) — recalcul des rappels après « sync » |
| IA locale Gemma (AIOrchestrator) | ⚠️ Équivalent | **z-ai-web-dev-sdk (LLM côté serveur)** pour formuler les messages + **fallback templates préparés** (AC-012 respecté : l'IA n'est jamais requise au déclenchement) |
| Annonces quand l'app est en arrière-plan | ⚠️ Limité web | Dans le sandbox : onglet ouvert requis ; comportement « arrière-plan » **documenté comme écart** (aucune fausse promesse) |

> Aucun développement n'a commencé. Cette capture + l'analyse d'écart constituent la Phase 1 partielle (Capture & Spécification). Les Phases 0/2/3 (UX, design technique, découpage) seront produites à réception du signal « GO ».

## 6. Ordre de réalisation (priorités CTO, spec §10)
1. Paramètres et préférences vocales
2. Notifications et planification locale des rappels
3. Synthèse vocale et messages prédéfinis
4. Détection des nouvelles tâches, échéances et priorités
5. Gestion des heures silencieuses et des doublons
6. Intégration IA pour les formulations conversationnelles
7. Synchronisation et tests arrière-plan Android/Linux *(cible Flutter — documentés comme hors sandbox)*

## Journal
- 2026-10-25 : Capture complète du module « Assistant vocal proactif et rappels intelligents » (FR-001→010, AC-001→012, préférences initiales, ordre de réalisation). Analyse d'écart plateforme consignée (§5). En attente du signal « GO » (AGENT 2).
