# 🎨 FEATURE-001 — DESIGN UX (Phase 0)
> Task ID 10-a · Agent UX/UI · 2026-10-25 · Approuvé : ORCHESTRATEUR

## 1. Écran unique à onglets (mobile-first)

L'app = **une seule page `/`** à 3 onglets (Tabs shadcn), en-tête fixe + footer sticky :

```
┌──────────────────────────────────────────────┐
│ 🔊 DevOS — Assistant vocal   [statut: ● actif]│  ← header (h1 sr-friendly)
├──────────────────────────────────────────────┤
│ [ Assistant ]  [ Tâches ]  [ Paramètres ]     │  ← Tabs
├──────────────────────────────────────────────┤
│  contenu de l'onglet                          │
├──────────────────────────────────────────────┤
│ footer sticky (© DevOS · état serveur/heure)  │  ← mt-auto, respecte safe-area
└──────────────────────────────────────────────┘
```

## 2. Onglet « Assistant » (tableau de bord vocal)
- **Carte de statut** : actif / suspendu / heure silencieuse en cours (badge + couleur sémantique, PAS de bleu/indigo : actif=emerald, suspendu=amber, silencieux=zinc).
- **Boutons d'action rapides** : « Tester la voix » (parle un exemple) · « Suspendre les annonces » (toggle + durée optionnelle) · « Activer les notifications » (si permission non accordée → bannière explicative FR-010/AC-010 : pourquoi, limites, onglet ouvert requis).
- **Journal des annonces** (max-h-96 overflow-y-auto, scrollbar stylée) : type (rappel/nouvelle tâche/échéance/priorité), heure, message, source («IA»/«préparé»), action « Reporter 5 min » (snooze) et « Voir la tâche » (switch vers onglet Tâches, item highlight).

## 3. Onglet « Tâches »
- Formulaire de création (Card) : titre*, description, catégorie (input + datalist), priorité (Select: basse/normale/haute/urgente), échéance (datetime-local), rappel par tâche (Switch + Select 5/15/30/60/custom min).
- Liste (max-h-96 scroll) : badge priorité (urgente=red, haute=amber, normale=zinc, basse=zinc-light), statut (en cours/terminée/annulée), échéance formatée locale (fr-FR), actions : Terminer ✓ / Annuler ✕ / Supprimer 🗑 (Dialog de confirmation).
- Filtres : statut + catégorie (Select). Terminée/annulée → grise + barrée, plus de rappels (AC-007 visible).

## 4. Onglet « Paramètres → Assistant vocal » (FR-006 — les 9 réglages)
Sections en Cards empilées, chaque changement persiste immédiatement (PUT) + toast de confirmation + miroir localStorage (offline) :
1. **Général** : Switch global « Assistant vocal activé » (défaut ON, AC-001).
2. **Rappels** : délai global Select 5/15/30/60 min + « personnalisé » (input min).
3. **Annonces** (3 Switchs indépendants) : nouvelles tâches / échéances / priorités (AC-003).
4. **Heures silencieuses** : Switch + heure début/fin (type=time) + jours (7 checkboxes lun→dim, défaut tous).
5. **Style** : RadioGroup naturel / professionnel / très bref.
6. **Voix et langue** : Select langue (fr-FR, en-US…) peuplé par `speechSynthesis.getVoices()` + Select voix filtrée par langue.
7. **Volume** : Slider 0–100.
8. **Catégories autorisées** : chips multi-select des catégories existantes (vide = toutes).
9. **Confidentialité** : Switch « Mode discret » (annonces génériques sans titre de tâche) + Switch « Alertes urgentes contournent le silencieux » (défaut OFF, opt-in explicite FR-007).
+ Zone actions : « Tester la voix » + « Suspendre les annonces » (redondance assumée avec l'onglet Assistant).

## 5. Parcours clés
- **P1 première visite** : page → bannière notifications expliquée → refus possible → app 100% fonctionnelle sans (AC-010).
- **P2 rappel** : tâche à H+1 → tick 30s → annonce vocale + toast + entrée journal + notification → snooze possible → **jamais re-annoncée** (AC-002/008).
- **P3 silencieux** : plage active → tick → annonce marquée « silencieux — non prononcée » (journal, pas de voix, notification muette), **jamais de rattrapage** en fin de plage (AC-009/FR-007).
- **P4 tâche modifiée/terminée** : recalcul immédiat au tick suivant ; terminée/annulée → aucune annonce (AC-007).

## 6. Règles transverses
Aucune couleur bleue/indigo · contrastes WCAG 2.1 AA · cibles tactiles ≥ 44px · `aria-live="polite"` sur le journal d'annonces · responsive 390px→1280px · footer sticky (min-h-screen flex flex-col + mt-auto) · toasts (pas d'alert()).
