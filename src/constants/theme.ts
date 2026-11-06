/**
 * ForgeAI Design System — Vercel Geist Monochrome Theme
 * Strictly black and white / grayscale with zero color hues.
 * Derived from DESIGN (1).md
 */
export const STITCH_COLORS = {
  // Canvas & Surfaces (Vercel Geist Dark Hierarchy)
  background: '#000000',           // Level 0 Base Application Canvas
  surface: '#000000',              // Base Surface
  surfaceDim: '#000000',           // Canvas Dim
  surfaceBright: '#1f1f1f',        // Highlight Surface
  surfaceContainerLowest: '#0a0a0a', // Level 1 Elevated Surface / Card Fill
  surfaceContainerLow: '#111111',    // Inset Wells / Code Blocks / Input Fill
  surfaceContainer: '#111111',       // Container Fill
  surfaceContainerHigh: '#171717',   // Hover Fill on Surfaces
  surfaceContainerHighest: '#1f1f1f', // Active / Selected Fill
  surfaceVariant: '#1f1f1f',

  // Typography & Content Contrast
  onSurface: '#ffffff',        // Primary Content & Headings (Pure White)
  onSurfaceVariant: '#a1a1a1', // Secondary Copy & Supporting Structure
  inverseSurface: '#ffffff',
  inverseOnSurface: '#000000',

  // Primary Action Accent (Vercel Pure White CTA)
  primary: '#ffffff',
  onPrimary: '#000000',
  primaryContainer: '#ffffff', // Primary interactive buttons & active triggers
  onPrimaryContainer: '#000000',
  inversePrimary: '#000000',
  primaryFixed: '#ededed',
  primaryFixedDim: '#a1a1a1',
  onPrimaryFixed: '#000000',
  onPrimaryFixedVariant: '#262626',

  // Secondary (Light Gray Links & Architecture Badges)
  secondary: '#a1a1a1',
  onSecondary: '#000000',
  secondaryContainer: '#262626',
  onSecondaryContainer: '#ededed',
  secondaryFixed: '#d4d4d4',
  secondaryFixedDim: '#737373',
  onSecondaryFixed: '#000000',
  onSecondaryFixedVariant: '#262626',

  // Tertiary & Status (Silver Monochrome - Verified / Running)
  tertiary: '#d4d4d4',
  onTertiary: '#000000',
  tertiaryContainer: '#1f1f1f',
  onTertiaryContainer: '#ffffff',
  tertiaryFixed: '#ededed',
  tertiaryFixedDim: '#a1a1a1',
  onTertiaryFixed: '#000000',
  onTertiaryFixedVariant: '#333333',
  emerald: '#ffffff',             // Monochrome status dot
  emeraldBg: 'rgba(255, 255, 255, 0.08)',
  emeraldBorder: '#333333',
  emeraldDark: '#ededed',

  // Hairline Boundaries & Dividers
  outline: '#737373',             // Muted captions & metadata
  outlineVariant: '#262626',      // 1px Default Hairline Border
  borderSubtle: '#262626',        // Default border
  borderStrong: '#333333',        // Hover / Focused containers
  borderEmphasis: '#454545',      // Active / High-contrast outlines

  // Functional Feedback (Grayscale Only - Structure & Contrast)
  error: '#ffffff',               // White text on dark error container
  onError: '#000000',
  errorContainer: '#1f1f1f',      // Dark container
  onErrorContainer: '#ffffff',    // White text
  success: '#ffffff',             // Monochrome success
  placeholder: '#525252',         // Disabled & inactive placeholders
};

