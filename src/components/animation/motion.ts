import { Easing, ReduceMotion, WithSpringConfig, WithTimingConfig } from 'react-native-reanimated';

/**
 * Shared motion tokens for ForgeAI.
 *
 * Every config uses ReduceMotion.System, so when the device's
 * "Remove animations" / reduce-motion setting is enabled, animations
 * jump straight to their final value instead of moving.
 */

/** Quick, nearly bounce-free spring used for press feedback and settling. */
export const PRESS_SPRING: WithSpringConfig = {
  damping: 20,
  stiffness: 360,
  mass: 0.6,
  reduceMotion: ReduceMotion.System,
};

/** Softer spring used for content entering the screen. */
export const ENTER_SPRING: WithSpringConfig = {
  damping: 22,
  stiffness: 200,
  mass: 0.8,
  reduceMotion: ReduceMotion.System,
};

export const FADE_TIMING: WithTimingConfig = {
  duration: 240,
  easing: Easing.out(Easing.cubic),
  reduceMotion: ReduceMotion.System,
};

export const QUICK_TIMING: WithTimingConfig = {
  duration: 150,
  easing: Easing.out(Easing.quad),
  reduceMotion: ReduceMotion.System,
};

/** Default scale for pressed elements — deliberately subtle. */
export const PRESSED_SCALE = 0.97;

/** Cap on staggered list entrance so long lists don't feel slow. */
export const MAX_STAGGER_ITEMS = 6;
export const STAGGER_STEP_MS = 45;

export const staggerDelay = (index: number): number =>
  Math.min(index, MAX_STAGGER_ITEMS) * STAGGER_STEP_MS;
