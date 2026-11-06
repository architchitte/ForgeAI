---
name: ForgeAI Design System
colors:
  surface: '#faf8ff'
  surface-dim: '#d2d9f4'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3ff'
  surface-container: '#eaedff'
  surface-container-high: '#e2e7ff'
  surface-container-highest: '#dae2fd'
  on-surface: '#131b2e'
  on-surface-variant: '#464555'
  inverse-surface: '#283044'
  inverse-on-surface: '#eef0ff'
  outline: '#777587'
  outline-variant: '#c7c4d8'
  surface-tint: '#4d44e3'
  primary: '#3525cd'
  on-primary: '#ffffff'
  primary-container: '#4f46e5'
  on-primary-container: '#dad7ff'
  inverse-primary: '#c3c0ff'
  secondary: '#0058be'
  on-secondary: '#ffffff'
  secondary-container: '#2170e4'
  on-secondary-container: '#fefcff'
  tertiary: '#005338'
  on-tertiary: '#ffffff'
  tertiary-container: '#006e4b'
  on-tertiary-container: '#67f4b7'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e2dfff'
  primary-fixed-dim: '#c3c0ff'
  on-primary-fixed: '#0f0069'
  on-primary-fixed-variant: '#3323cc'
  secondary-fixed: '#d8e2ff'
  secondary-fixed-dim: '#adc6ff'
  on-secondary-fixed: '#001a42'
  on-secondary-fixed-variant: '#004395'
  tertiary-fixed: '#6ffbbe'
  tertiary-fixed-dim: '#4edea3'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005236'
  background: '#faf8ff'
  on-background: '#131b2e'
  surface-variant: '#dae2fd'
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
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
    letterSpacing: -0.01em
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
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

This design system embodies a modern, technical, and high-clarity aesthetic tailored for showcase platforms, portfolio hubs, and student-built AI systems. Drawing direct inspiration from minimalist developer ecosystems (Linear, Vercel, and modern GitHub), the interface prioritizes project visibility, artifact demonstration, and clean code metrics over ornamental chrome.

The visual style blends **precision minimalism** with subtle technical utility:
- **Tone:** Methodical, intellectual, forward-leaning, and high-trust.
- **Emotion:** Focus, credibility, elegance, and unhindered productivity.
- **Visual Identity:** Pure layered off-white backdrops, crisp 1px hair-thin structural boundaries, precise geometric typography, and surgical bursts of high-saturation cobalt and emerald signifying production-grade execution.

## Colors

The palette employs an analytical, high-contrast light model designed for crisp readability and sustained screen time:

- **Canvas & Surface Architecture:**
  - Base Application Canvas: `#FAFAFC`
  - Elevated Surface / Container Fill: `#FFFFFF`
  - Subdued / Inset Wells: `#F1F5F9`
  - Hairline Boundaries & Dividers: `#E2E8F0` and `#EAECF0`

- **Typography & Content Contrast:**
  - Primary Content / Headings: Deep Charcoal `#0F172A`
  - Body Copy & Secondary Structure: Slate `#334155`
  - Muted Captions, Metadata & Keyboard Shortcuts: Cool Slate `#64748B`
  - Disabled & Inactive Placeholders: `#94A3B8`

- **Functional Accents:**
  - **Primary (Electric Cobalt):** `#4F46E5` (interactive triggers, primary tags) shifting to `#4338CA` on hover/active states.
  - **Secondary (Technical Blue):** `#3B82F6` (informational links, repository references, model architecture badges).
  - **Tertiary / Success (Mint Emerald):** `#10B981` (active demo instances, model verified tags, running container status).

## Typography

The typographic hierarchy prioritizes systematic structure, code-like density, and tight character tracking:

- **Display & Headings:** Set in `Geist` with negative letter-spacing for a cohesive, engineered appearance. Headings never use heavy black weights; maximum weight is kept to 600 (SemiBold) to preserve the airy, disciplined feel.
- **Body & Prose:** Set in `Geist` regular and medium weights for optimal legibility across documentation, benchmark graphs, and project summaries.
- **Labels, Statuses, & Code:** Set in `JetBrains Mono` for metadata attributes, model parameter numbers, commit hashes, latency metrics, and API status chips.

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

## Elevation & Depth

Visual separation relies on **low-contrast micro-borders** complemented by ultra-soft ambient light falloffs rather than heavy drop shadows:

- **Border Architecture:**
  - All cards, code blocks, navigation headers, and input controls leverage a unified 1px solid hairline border (`#E2E8F0` or `#EAECF0`).
- **Elevation Layers:**
  - **Flat / Level 0 (Base Canvas):** `#FAFAFC` (no shadow, strictly background).
  - **Level 1 (Card & Section Containers):** Pure `#FFFFFF` fill with `1px solid #E2E8F0` and subtle ambient diffusion: `0 1px 2px 0 rgba(15, 23, 42, 0.04)`.
  - **Level 2 (Interactive Hover / Floating Elements):** Surface `#FFFFFF`, border `#CBD5E1`, with elevation `0 4px 12px -2px rgba(15, 23, 42, 0.06), 0 2px 4px -2px rgba(15, 23, 42, 0.04)`.
  - **Level 3 (Modals / Flyouts / Command Menus):** Surface `#FFFFFF`, border `#CBD5E1`, with elevation `0 12px 32px -4px rgba(15, 23, 42, 0.08), 0 4px 8px -2px rgba(15, 23, 42, 0.04)`.

## Shapes

The geometric form language balances modern approachable software ergonomics with modular discipline:

- Standard cards, interactive showcase panels, and model containers use `rounded-xl` (1.5rem / 24px).
- Embedded secondary controls, toolbars, and input fields use `rounded-lg` (1rem / 16px).
- Small functional components, utility chips, metric tags, and keycap badges use standard rounded tokens (0.5rem / 8px).
- Status pill dots and avatar badges remain fully circular.

## Components

### Buttons
- **Primary:** Solid `#4F46E5` background, `#FFFFFF` text, subtle `0 1px 2px rgba(79, 70, 229, 0.2)` shadow. On hover: shifts to `#4338CA`.
- **Secondary / Outline:** Pure `#FFFFFF` background, `1px solid #E2E8F0`, text `#0F172A`. On hover: background `#F8FAFC`, border `#CBD5E1`.
- **Ghost:** Transparent background, text `#334155`. On hover: background `#F1F5F9`, text `#0F172A`.

### Cards & Showcase Panels
- Pure `#FFFFFF` background, `1px solid #E2E8F0` outer edge, `rounded-xl` corners.
- Hover states feature a subtle shift to `#CBD5E1` for borders and a +2px soft ambient elevation lift.
- Internal headers include top-right status chips and monospaced tech tags.

### Status Chips & Badges
- **Verified / Running:** Light emerald tint `#ECFDF5`, text `#065F46`, border `1px solid #A7F3D0`, containing an active green `#10B981` 6px indicator dot.
- **Model Framework (PyTorch/Transformers):** Subtle cool slate `#F1F5F9`, text `#334155`, border `1px solid #E2E8F0`, typography `label-sm`.

### Input Fields & Search Bars
- Background `#FFFFFF`, 1px border `#E2E8F0`, `rounded-lg` radius. Placeholder text `#94A3B8`.
- Focus state: border `#4F46E5`, clean focus ring of `0 0 0 3px rgba(79, 70, 229, 0.12)`.

### Checkboxes & Radios
- Size 16px, background `#FFFFFF`, border `1.5px solid #CBD5E1`.
- Checked state: background `#4F46E5`, border `#4F46E5`, white check icon with `rounded` corners (4px radius for checkboxes, full circle for radios).

### AI Metrics & Performance Displays
- Specialized data modules with muted labels (`label-sm`), high-contrast numeric values in `JetBrains Mono` (`headline-sm`), and a soft hairline top separator (`#EAECF0`).