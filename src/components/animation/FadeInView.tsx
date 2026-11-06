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
}

/**
 * Fades (and optionally lifts) its children in once, on mount.
 * Remount it with a new `key` to replay the entrance.
 */
export const FadeInView: React.FC<FadeInViewProps> = ({
  style,
  children,
  delay = 0,
  offset = 8,
  disabled = false,
  ...rest
}) => {
  const progress = useSharedValue(disabled ? 1 : 0);
  const translateY = useSharedValue(disabled ? 0 : offset);

  useEffect(() => {
    if (disabled) return;
    progress.value = withDelay(delay, withTiming(1, FADE_TIMING));
    translateY.value = withDelay(delay, withSpring(0, ENTER_SPRING));
    // Entrance runs once per mount by design; remount with a new key to replay.
  }, []);

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
