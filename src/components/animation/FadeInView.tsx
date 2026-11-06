import React, { useEffect } from 'react';
import { StyleProp, ViewProps, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { ENTER_SPRING, FADE_TIMING } from './motion';

export interface FadeInViewProps extends Omit<ViewProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
  /** Delay before the entrance starts, in ms. */
  delay?: number;
  /** Starting vertical offset in px (0 = pure fade). */
  offset?: number;
  /** Skip the entrance entirely and render in the final state. */
  disabled?: boolean;
  /**
   * Replays the entrance whenever this value changes, without remounting
   * children (for screens that stay mounted while hidden).
   */
  trigger?: string | number | boolean;
}

/**
 * Fades (and optionally lifts) its children in on mount.
 * Replay it by remounting with a new `key`, or by changing `trigger`.
 */
export const FadeInView: React.FC<FadeInViewProps> = ({
  style,
  children,
  delay = 0,
  offset = 8,
  disabled = false,
  trigger,
  ...rest
}) => {
  const progress = useSharedValue(disabled ? 1 : 0);
  const translateY = useSharedValue(disabled ? 0 : offset);

  useEffect(() => {
    if (disabled) return;
    progress.value = 0;
    translateY.value = offset;
    progress.value = withDelay(delay, withTiming(1, FADE_TIMING));
    translateY.value = withDelay(delay, withSpring(0, ENTER_SPRING));
    // Runs on mount, and again only when `trigger` changes.
  }, [trigger]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View {...rest} style={[style, animatedStyle]}>
      {children}
    </Animated.View>
  );
};
