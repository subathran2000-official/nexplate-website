# NEXPLATE design system

Tokens live at the top of `style.css` (`:root`). Use the token, not the hex.

## Typography

Two families, both self-hosted (`/fonts`, Latin subset, `font-display: swap`, preloaded):

| Role | Family | Weights | Used for |
|---|---|---|---|
| Headings | Manrope (variable) | 500–800 | h1–h3, prices, numbers |
| Body / UI | DM Sans (variable) | 400–700 | paragraphs, navigation, buttons, forms |

Fallback stacks: `"Segoe UI", Arial, sans-serif`.

### Scale (fluid, `clamp()` between ~360px and ~1280px)

| Token | Size | Use | Line height | Tracking |
|---|---|---|---|---|
| `--fs-h1` | 2.5rem → 5rem | page title (one per page) | 1.1 | -0.03em |
| `--fs-h2` | 1.875rem → 3.125rem | section title | 1.1 | -0.025em |
| `--fs-h3` | 1.25rem → 1.5rem | card title | 1.1 | -0.015em |
| `--fs-lead` | 1.0625rem → 1.25rem | intro paragraph | 1.65 | 0 |
| `--fs-base` | 1rem → 1.0625rem | body | 1.65 | 0 |
| `--fs-sm` | 0.875rem (14px) | navigation, buttons, table text | 1.65 | 0.01em on buttons |
| `--fs-xs` | 0.75rem (12px) | eyebrows, captions, legal. **Minimum size on the site.** | 1.65 | 0.14em on eyebrows (uppercase) |

Paragraph measure: `--measure: 65ch` (lead text 60ch). Headings use `text-wrap: balance`, paragraphs `text-wrap: pretty`.

## Colour

Built around the existing brand orange `#F66B13`. Contrast figures are WCAG 2.x ratios (AA needs 4.5:1 for normal text, 3:1 for large text and UI components).

### Brand

| Token | HEX | Role | Contrast |
|---|---|---|---|
| `--brand-500` | `#F66B13` | Original brand orange. **Decoration, shapes, 3D, icons only** — not for text | 2.8 on paper |
| `--brand-300` | `#FFA263` | Accent text on dark surfaces | 8.0 on ink |
| `--brand-large` | `#D4500A` | Large display text only (h1 accent) | 4.0 on paper (AA large) |
| `--brand-600` | `#C2410C` | **Primary button background**, white text | 5.2 with white |
| `--brand-text` | `#B43A0A` | Small orange text and links on light surfaces | 5.6 on paper, 5.1 on surface-2 |
| `--brand-700` | `#9A3412` | Button hover | 7.3 with white |
| — | `#7C2A0E` | Button active (`--btn-bg-active`) | |

### Neutrals

| Token | HEX | Role |
|---|---|---|
| `--ink` | `#17242D` | Primary text, dark surfaces, secondary button text (15.8 with white) |
| `--ink-2` | `#22333D` | Raised dark surface |
| `--muted` | `#56636A` | Secondary text (5.8 on paper, 6.4 on white) |
| `--paper` | `#F9F8F4` | Page background |
| `--surface` | `#FFFFFF` | Cards, forms |
| `--surface-2` | `#F0EDE5` | Subtle panels |
| `--line` | `#DCDED8` | Hairlines |
| `--line-strong` | `#BFC4C1` | Input hover, secondary button border |

### Status

| Token | Text | Background | Use |
|---|---|---|---|
| success | `#24714B` | `#E8F5EE` | confirmations, “Paid in full” |
| warning | `#92400E` | `#FEF3C7` | cautions |
| danger | `#B42318` | `#FEE4E2` | errors, invalid fields |
| info | `#1D4ED8` | `#E0E9FF` | neutral notices |

### Interaction states

| State | Treatment |
|---|---|
| Hover | button `#C2410C → #9A3412`; secondary gains surface fill + ink border; nav link underline |
| Focus (keyboard) | 3px `--focus` (`--ink`) outline, 3px offset; white on dark surfaces (`.cta`, `.cta3d`) |
| Active | button `#7C2A0E`, scale 0.98 |
| Disabled | 50% opacity, `not-allowed`, no pointer events; inputs use `--surface-2` |
| Invalid | input border `--danger` (`:user-invalid`) |

Colour is used to direct attention: the only filled orange element in any view is the primary action; everything else is ink, white or muted.

## Spacing

`--sp-1 … --sp-9` = 4, 8, 12, 16, 24, 32, 48, 72, 96px. Sections use `clamp(56px, 8vw, 96px)` vertical padding.

## Motion

Entrance, hover and 3D motion are gated by `prefers-reduced-motion`. With reduced motion, the 3D scenes render a still frame and content is never hidden. Three.js loads on idle, is skipped for Save-Data and 2G connections, and the page is fully readable without it.
