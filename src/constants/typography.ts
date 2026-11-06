/**
 * ForgeAI Typography — Geist + Geist Mono (per DESIGN.md).
 *
 * On Android a custom font family does not switch weights via `fontWeight`,
 * so every weight is its own family. Use FONTS.sans[...] / FONTS.mono[...]
 * instead of `fontWeight` in styles.
 *
 * DESIGN.md caps weight at 600 (SemiBold) — "never use heavy black weights" —
 * so 700/800 resolve to SemiBold.
 */
import { Geist_400Regular } from '@expo-google-fonts/geist/400Regular';
import { Geist_500Medium } from '@expo-google-fonts/geist/500Medium';
import { Geist_600SemiBold } from '@expo-google-fonts/geist/600SemiBold';
import { GeistMono_400Regular } from '@expo-google-fonts/geist-mono/400Regular';
import { GeistMono_500Medium } from '@expo-google-fonts/geist-mono/500Medium';
import { GeistMono_600SemiBold } from '@expo-google-fonts/geist-mono/600SemiBold';

/** Passed to expo-font's useFonts() in App.tsx. Keys are the family names. */
export const FONT_ASSETS = {
  Geist_400Regular,
  Geist_500Medium,
  Geist_600SemiBold,
  GeistMono_400Regular,
  GeistMono_500Medium,
  GeistMono_600SemiBold,
};

export const FONTS = {
  sans: {
    regular: 'Geist_400Regular',
    medium: 'Geist_500Medium',
    semibold: 'Geist_600SemiBold',
  },
  mono: {
    regular: 'GeistMono_400Regular',
    medium: 'GeistMono_500Medium',
    semibold: 'GeistMono_600SemiBold',
  },
} as const;

type Weight = '400' | '500' | '600' | '700' | '800';

/** Resolve a numeric weight to the matching Geist family (for dynamic styles). */
export const fontFamilyFor = (weight: Weight = '400', mono = false): string => {
  const set = mono ? FONTS.mono : FONTS.sans;
  if (weight === '400') return set.regular;
  if (weight === '500') return set.medium;
  return set.semibold;
};
