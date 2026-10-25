# ♿ GUIDE D'ACCESSIBILITÉ (a11y)

> **Dernière mise à jour** : 2026-10-25 (UTC) · **Responsable** : AGENT a11y · **Cible** : WCAG 2.1 AA

## 1. Niveau cible : WCAG 2.1 AA (obligatoire pour toute feature frontend)

## 2. Règles applicables au projet

### Structure sémantique
- Balises `main`, `header`, `nav`, `section`, `article`, `footer` obligatoires (pas de `div` génériques pour des régions).
- Une seule `h1` par page ; hiérarchie de titres sans saut.
- Contenu pour lecteurs d'écran : classe `sr-only`.

### Navigation clavier (testée à chaque feature)
- Ordre de tabulation logique ; aucun piège clavier (hors modales volontaires).
- Focus visible sur **tous** les éléments interactifs (`focus-visible:ring-2 ring-ring`).
- Modales/Dialogs (Radix) : focus piégé + `Esc` ferme + retour focus au déclencheur (natif shadcn — à ne pas casser).
- Raccourcis : aucune action critique accessible uniquement à la souris.

### ARIA
- `aria-label`/`aria-labelledby` sur boutons icon-only et régions.
- `role`, `aria-live="polite"` sur les toasts et zones de statut dynamiques.
- `aria-expanded`/`aria-controls` sur accordéons, menus, collapsibles.
- ⚠️ Ne jamais doubler un attribut ARIA redondant avec un rôle natif (ex : `role="button"` sur un `<button>`).

### Formulaires
- `<Label>` associé à chaque champ (composant shadcn `Form`).
- Erreurs : texte lié via `aria-describedby` + `aria-invalid` + message explicite (pas seulement une couleur).
- Validation annoncée via les toasts + focus sur la 1ère erreur.

### Contrastes (thème neutre actuel — vérifiés)
| Combinaison | Ratio estimé | Seuil AA |
|---|---|---|
| `foreground` (0.145) sur `background` (1.0) | ≈ 17:1 | ✅ AAA |
| `muted-foreground` (0.556) sur `background` | ≈ 5.5:1 | ✅ AA |
| `primary-foreground` (0.985) sur `primary` (0.205) | ≈ 15:1 | ✅ AAA |
> Toute nouvelle couleur DOIT être validée ici avec son ratio calculé.

### Images & médias
- `alt` descriptif obligatoire (ou `alt=""` si décoratif) — ESLint `@next/next/no-img-element` désactivé dans le scaffold mais `next/image` recommandé.
- Aucune information portée uniquement par la couleur.

## 3. Checklist de validation par feature (blocage si échec)
- [ ] Parcours complet au clavier sans souris
- [ ] Focus visible partout
- [ ] Labels/ARIA corrects (audit du DOM)
- [ ] Contrastes AA validés
- [ ] Lisible à 200% de zoom
- [ ] Testé avec l'arborescence d'accessibilité (devtools)

## Journal
- 2026-10-25 : Création du guide (AGENT a11y). Audit initial : scaffold conforme sur la page d'accueil (1 seul `<img alt>` correct, pas de formulaire).
