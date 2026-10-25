# 🎨 DESIGN SYSTEM

> **Dernière mise à jour** : 2026-10-25 (UTC) · **Responsable** : AGENT UX/UI DESIGNER · **Base** : `src/app/globals.css` (tokens réels extraits)

## 1. Fondations

- **Moteur** : Tailwind CSS 4 (thème inline via `@theme`) + variables CSS oklch.
- **Mode sombre** : classe `.dark` (via `@custom-variant dark`) — next-themes disponible.
- **Fonts** : Geist Sans (`--font-sans`) et Geist Mono (`--font-mono`) chargées dans `layout.tsx`.
- **Radius de base** : `0.625rem` (échelle sm/md/lg/xl dérivée).

## 2. Palette (tokens actuels — thème neutre monochrome)

| Token | Clair | Usage |
|---|---|---|
| `--background` | `oklch(1 0 0)` blanc | Fond global |
| `--foreground` | `oklch(0.145 0 0)` noir | Texte |
| `--primary` | `oklch(0.205 0 0)` | Actions principales |
| `--muted` / `--muted-foreground` | gris clair / gris moyen | Textes secondaires |
| `--destructive` | `oklch(0.577 0.245 27.325)` rouge | Erreurs/suppression |
| `--chart-1..5` | orange, teal, bleu-nuit, jaune, orange clair | Dataviz |
| `--border` / `--input` | `oklch(0.922 0 0)` | Séparations/champs |

> ⚠️ **Règle projet** : pas de bleu/indigo comme couleur primaire (sauf demande CTO). Le thème neutre actuel est conforme.

## 3. Bibliothèque de composants (inventaire réel `src/components/ui/`)

**Actions** : Button · Toggle · ToggleGroup
**Formulaires** : Input · Textarea · Select · Checkbox · RadioGroup · Switch · Slider · InputOTP · Form (react-hook-form) · Label · DatePicker (Calendar)
**Feedback** : Alert · AlertDialog · Toast/Toaster · Sonner · Progress · Skeleton · Spinner (via lucide)
**Surfaces** : Card · Table · Tabs · Accordion · Collapsible · Sheet · Dialog · Drawer · Popover · Tooltip · HoverCard
**Navigation** : NavigationMenu · Menubar · Breadcrumb · Pagination · Sidebar · Command
**Données** : Table · Chart (Recharts) · Carousel (Embla) · Resizable (panels) · Avatar · Badge · Separator · ScrollArea · AspectRatio · ContextMenu · DropdownMenu

**Règle d'usage** : un composant existant DOIT être utilisé avant d'en créer un nouveau. Toute nouvelle primitive va dans `src/components/<domaine>/` et s'inspire des patterns shadcn (CVA + Radix).

## 4. Règles de composition UI (standards du projet)

1. **Responsive mobile-first** : breakpoints `sm: md: lg: xl:` — jamais de layout figé desktop.
2. **Cibles tactiles ≥ 44px** pour tout élément interactif.
3. **Cards** : padding cohérent `p-4`/`p-6`, espacement `gap-4`/`gap-6`.
4. **Listes longues** : `max-h-96 overflow-y-auto` + scrollbar stylée.
5. **Footer sticky** : wrapper `min-h-screen flex flex-col` + footer `mt-auto` ; respect des safe-areas iOS.
6. **Icons** : uniquement `lucide-react`.
7. **Animations** : Framer Motion, subtiles (hover/focus/transitions de page).
8. **Hiérarchie typographique** : `text-3xl/2xl` titres → `text-base` corps → `text-sm/xs` secondaire.

## 5. Wireframes
*(aucun en cours — en attente de la première feature)*

## Journal
- 2026-10-25 : Création, extraction des tokens réels depuis `globals.css` et inventaire des composants (AGENT UX/UI).
