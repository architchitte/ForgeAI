---
name: ForgeAI Design System
colors:
  surface: '#000000'
  surface-dim: '#000000'
  surface-bright: '#1f1f1f'
  surface-container-lowest: '#000000'
  surface-container-low: '#0a0a0a'
  surface-container: '#111111'
  surface-container-high: '#171717'
  surface-container-highest: '#1f1f1f'
  on-surface: '#ededed'
  on-surface-variant: '#a1a1a1'
  inverse-surface: '#ffffff'
  inverse-on-surface: '#000000'
  outline: '#454545'
  outline-variant: '#262626'
  surface-tint: '#ffffff'
  primary: '#ffffff'
  on-primary: '#000000'
  primary-container: '#ededed'
  on-primary-container: '#000000'
  inverse-primary: '#000000'
  secondary: '#a1a1a1'
  on-secondary: '#000000'
  secondary-container: '#262626'
  on-secondary-container: '#ededed'
  tertiary: '#d4d4d4'
  on-tertiary: '#000000'
  tertiary-container: '#333333'
  on-tertiary-container: '#ffffff'
  error: '#ffffff'
  on-error: '#000000'
  error-container: '#1f1f1f'
  on-error-container: '#ffffff'
  primary-fixed: '#ededed'
  primary-fixed-dim: '#a1a1a1'
  on-primary-fixed: '#000000'
  on-primary-fixed-variant: '#262626'
  secondary-fixed: '#d4d4d4'
  secondary-fixed-dim: '#737373'
  on-secondary-fixed: '#000000'
  on-secondary-fixed-variant: '#262626'
  tertiary-fixed: '#ededed'
  tertiary-fixed-dim: '#a1a1a1'
  on-tertiary-fixed: '#000000'
  on-tertiary-fixed-variant: '#333333'
  background: '#000000'
  on-background: '#ededed'
  surface-variant: '#1f1f1f'
typography:
  display:
    fontFamily: Geist
    fontSize: 48px
    fontWeight: '600'
    lineHeight: 56px
    letterSpacing: -0.03em
  headline-lg:
    fontFamily: Geist
    fontSize: 36px
    fontWeight: '600'
    lineHeight: 44px
    letterSpacing: -0.025em
  headline-lg-mobile:
    fontFamily: Geist
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.02em
  headline-sm:
    fontFamily: Geist
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.015em
  title-md:
    fontFamily: Geist
    fontSize: 16px
    fontWeight: '500'
    lineHeight: 24px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Geist
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 26px
    letterSpacing: -0.005em
  body-md:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 22px
    letterSpacing: 0em
  body-sm:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: 0em
  label-md:
    fontFamily: Geist Mono
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
    letterSpacing: -0.01em
  label-sm:
    fontFamily: Geist Mono
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.375rem
  md: 0.5rem
  lg: 0.75rem
  xl: 1rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-mobile: 1rem
  margin: 2.5rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

This design system embodies a stark, technical, and high-clarity aesthetic tailored for showcase platforms, portfolio hubs, and student-built AI systems. Drawing direct inspiration from Vercel and its Geist design language, the interface is **dark mode only** and **strictly black and white**: every surface, border, text, and control is expressed in pure black, pure white, or a neutral gray between them. There are no hues anywhere in the UI.

The visual style is **monochrome precision minimalism**:
- **Tone:** Methodical, confident, quiet, and high-trust.
- **Emotion:** Focus, credibility, restraint, and unhindered productivity.
- **Visual Identity:** A pure black canvas, crisp 1px hairline borders, precise geometric typography, and a single white accent used for the one thing that matters on screen. Hierarchy comes from contrast, weight, spacing, and borders, never from color.

**Rules of the system:**
- Dark mode only. There is no light theme and no theme toggle. Set `color-scheme: dark` on `:root`.
- Grayscale only. Every color value must have equal R, G, and B channels (`#RRGGBB` where RR = GG = BB). No tints, no gradients with hue, no colored glows.
- Meaning is never carried by color alone. Status, errors, and selection use labels, icons, border style, fill inversion, or weight.

## Colors

The palette is a single neutral ramp from black to white, modeled on Vercel's Geist gray scale.

- **Canvas & Surface Architecture:**
  - Base Application Canvas: `#000000`
  - Elevated Surface / Card Fill: `#0A0A0A`
  - Inset Wells / Code Blocks / Input Fill: `#111111`
  - Hover Fill on Surfaces: `#171717`
  - Active / Selected Fill: `#1F1F1F`

- **Hairline Boundaries & Dividers:**
  - Default Border: `#262626`
  - Strong Border (hover, focused containers): `#333333`
  - Emphasis Border (active, high-contrast outlines): `#454545`

- **Typography & Content Contrast:**
  - Primary Content / Headings: Pure White `#FFFFFF` (headings) and Off-White `#EDEDED` (body)
  - Secondary Copy & Supporting Structure: `#A1A1A1`
  - Muted Captions, Metadata & Keyboard Shortcuts: `#737373`
  - Disabled & Inactive Placeholders: `#525252`

- **Functional Accents (monochrome):**
  - **Primary (White):** `#FFFFFF` for the main call to action and active indicators, shifting to `#D4D4D4` on hover and `#A1A1A1` on press. Text on primary is `#000000`.
  - **Secondary (Light Gray):** `#A1A1A1` for links, repository references, and architecture badges. Links are underlined on hover and use `#EDEDED` on hover.
  - **Tertiary (Silver):** `#D4D4D4` for verified and running states, always paired with an icon or label.
  - **Error:** `#FFFFFF` text on `#1F1F1F` with a dashed `#737373` border and an explicit icon and message. Errors are distinguished by structure and copy, not hue.

- **Selection & Focus:**
  - Text selection: background `#FFFFFF`, text `#000000`.
  - Focus ring: `0 0 0 2px #000000, 0 0 0 4px #FFFFFF` (black gap, white ring) so it is visible on every surface.

## Typography

The typographic hierarchy prioritizes systematic structure, code-like density, and tight character tracking. Use Geist and Geist Mono, both free from Vercel.

- **Display & Headings:** Set in `Geist` with negative letter-spacing for a cohesive, engineered appearance. Headings are `#FFFFFF`. Maximum weight is 600 (SemiBold); never use heavy black weights.
- **Body & Prose:** Set in `Geist` regular and medium weights in `#EDEDED`, with supporting copy in `#A1A1A1`.
- **Labels, Statuses, & Code:** Set in `Geist Mono` for metadata attributes, model parameter numbers, commit hashes, latency metrics, and API status chips.
- **Rendering:** Enable `-webkit-font-smoothing: antialiased` and `text-rendering: optimizeLegibility`. Light text on black looks heavier, so avoid weights above 500 for body copy.

## Layout & Spacing

The design system uses a 12-column responsive fluid grid anchored by strict 4px/8px incremental units:

- **Breakpoints:**
  - Mobile: `< 640px` (Single column, `margin: 1rem`, `gutter: 1rem`)
  - Tablet: `640px - 1024px` (6 to 8 columns, `margin: 1.5rem`, `gutter: 1.25rem`)
  - Desktop: `> 1024px` (12 columns, max-width `1280px` centered, `margin: 2.5rem`, `gutter: 1.5rem`)

- **Alignment Principles:**
  - Component gutters enforce vertical rhythm without clutter.
  - Showcase cards and showcase metrics utilize consistent internal padding (`space-lg` desktop, `space-md` mobile).
  - Nested UI modules stack neatly within modular flex columns using `space-xs` and `space-sm` gaps.
  - Generous empty black space is part of the design. Do not fill it with decoration.

## Elevation & Depth

On a black canvas, shadows are invisible, so depth is built from **border brightness and surface lightness** rather than drop shadows:

- **Border Architecture:**
  - All cards, code blocks, navigation headers, and input controls use a unified 1px solid hairline border (`#262626`).
- **Elevation Layers:**
  - **Level 0 (Base Canvas):** `#000000`, no border, no shadow.
  - **Level 1 (Cards & Section Containers):** Fill `#0A0A0A`, border `1px solid #262626`.
  - **Level 2 (Hover / Floating Elements):** Fill `#111111`, border `#333333`. No shadow required.
  - **Level 3 (Modals / Flyouts / Command Menus):** Fill `#111111`, border `#333333`, with a deep neutral shadow `0 16px 40px -8px rgba(0, 0, 0, 0.8)` and a `rgba(0, 0, 0, 0.6)` backdrop scrim behind the modal.
- **Optional top-edge highlight:** A 1px inset `rgba(255, 255, 255, 0.04)` line along the top of Level 1 and 2 surfaces adds subtle lift. Use sparingly.
- **Backgrounds:** Solid black only. No gradients, mesh glows, or colored blurs. A faint grid or dot pattern in `#1F1F1F` is allowed on hero sections.

## Shapes

The geometric form language follows Vercel's tighter, more engineered radii:

- Standard cards, interactive showcase panels, and model containers use `rounded-xl` (1rem / 16px).
- Embedded secondary controls, toolbars, buttons, and input fields use `rounded` (0.375rem / 6px) to `rounded-md` (0.5rem / 8px).
- Small functional components, utility chips, metric tags, and keycap badges use `rounded-sm` (0.25rem / 4px) or `rounded-md`.
- Status pill dots, pill badges, and avatars remain fully circular (`rounded-full`).

## Components

### Buttons
- **Primary:** Solid `#FFFFFF` background, `#000000` text, no shadow. On hover: `#D4D4D4`. On press: `#A1A1A1`.
- **Secondary / Outline:** `#000000` background, `1px solid #333333`, text `#EDEDED`. On hover: background `#111111`, border `#454545`.
- **Ghost:** Transparent background, text `#A1A1A1`. On hover: background `#171717`, text `#FFFFFF`.
- **Disabled:** Background `#111111`, text `#525252`, no border change, `cursor: not-allowed`.
- All buttons use `rounded-md` (6px to 8px), 14px `Geist` medium text, and 32px / 40px / 48px heights.

### Cards & Showcase Panels
- `#0A0A0A` background, `1px solid #262626` outer edge, `rounded-xl` corners.
- Hover states shift the border to `#333333` and the fill to `#111111`.
- Internal headers include top-right status chips and monospaced tech tags.

### Status Chips & Badges
- **Verified / Running:** Fill `#FFFFFF` at 10% (`rgba(255, 255, 255, 0.08)`), text `#EDEDED`, border `1px solid #333333`, with a 6px solid white `#FFFFFF` dot. The label text ("Running", "Verified") is always shown.
- **Inactive / Stopped:** Same chip with a hollow 6px dot (`1.5px solid #737373`, transparent fill) and text `#A1A1A1`.
- **Error / Failed:** Dashed `1px #737373` border, text `#FFFFFF`, with a "!" or "x" icon and the word "Failed".
- **Model Framework (PyTorch/Transformers):** Fill `#111111`, text `#A1A1A1`, border `1px solid #262626`, typography `label-sm` in `Geist Mono`.

### Input Fields & Search Bars
- Background `#000000`, 1px border `#262626`, `rounded-md` radius. Text `#EDEDED`. Placeholder text `#525252`.
- Hover state: border `#333333`.
- Focus state: border `#FFFFFF`, with ring `0 0 0 3px rgba(255, 255, 255, 0.12)`.
- Error state: dashed border `#737373` with a helper message in `#FFFFFF` beneath the field.

### Checkboxes & Radios
- Size 16px, background `#000000`, border `1.5px solid #454545`.
- Checked state: background `#FFFFFF`, border `#FFFFFF`, black `#000000` check icon (4px radius for checkboxes, full circle for radios).

### Navigation & Command Menu
- Top navigation: `#000000` at 80% opacity with a 12px backdrop blur, `1px solid #262626` bottom border.
- Active nav item: text `#FFFFFF`; inactive: `#A1A1A1`. Active state is also marked with a 1px white underline.
- Command menu (Level 3): `#111111` surface, `1px solid #333333`, highlighted row fill `#1F1F1F`. Keyboard shortcuts appear as keycap badges in `Geist Mono`, `#A1A1A1` on `#171717`.

### Code Blocks & Tables
- Code blocks: `#0A0A0A` fill, `1px solid #262626`, `rounded-lg`, `Geist Mono` 13px. Syntax highlighting is grayscale only: keywords `#FFFFFF` (semibold), strings `#D4D4D4`, comments `#737373` (italic), punctuation `#A1A1A1`.
- Tables: no outer fill, `1px solid #262626` row dividers, header text `#A1A1A1` in `label-sm`, row hover fill `#0A0A0A`.

### AI Metrics & Performance Displays
- Specialized data modules with muted labels (`label-sm`, `#737373`), high-contrast numeric values in `Geist Mono` (`headline-sm`, `#FFFFFF`), and a soft hairline top separator (`#262626`).
- Charts use grayscale series differentiated by tone (`#FFFFFF`, `#A1A1A1`, `#525252`), line style (solid, dashed, dotted), and direct labels. Never rely on hue to separate series.

### Motion
- Transitions are fast and subtle: `150ms ease-out` for color, border, and background changes.
- No bouncing, glowing, or looping decorative animation. Respect `prefers-reduced-motion`.

## Do & Don't

- **Do** use pure `#000000` for the page background and `#FFFFFF` for the single primary action per view.
- **Do** build hierarchy with border brightness, text gray level, and spacing.
- **Do** keep every color value neutral gray (equal R, G, B).
- **Don't** introduce blue, green, red, or any other hue, including for links, success, and errors.
- **Don't** use gradients, colored shadows, or glassmorphism beyond the nav backdrop blur.
- **Don't** ship a light theme or follow `prefers-color-scheme: light`.