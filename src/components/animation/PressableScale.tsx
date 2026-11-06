import React from 'react';
import {
  GestureResponderEvent,
  Pressable,
  PressableProps,
  StyleProp,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { PRESSED_SCALE, PRESS_SPRING, QUICK_TIMING } from './motion';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface PressableScaleProps extends Omit<PressableProps, 'style' | 'children'> {
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
  /** Opacity while pressed. Mirrors TouchableOpacity's prop (default 0.8). */
  activeOpacity?: number;
  /** Scale while pressed (default 0.97). Pass 1 to disable scaling. */
  pressedScale?: number;
}

/**
 * Drop-in replacement for TouchableOpacity: keeps the opacity dip and adds
 * a subtle scale-down on press with a spring-based release.
 */
export const PressableScale: React.FC<PressableScaleProps> = ({
  style,
  children,
  activeOpacity = 0.8,
  pressedScale = PRESSED_SCALE,
  onPressIn,
  onPressOut,
  disabled,
  ...rest
}) => {
  const pressed = useSharedValue(0);

  // Respect any opacity already set by the caller's style (e.g. disabled state).
  const flatOpacity = StyleSheet.flatten(style)?.opacity;
  const baseOpacity = typeof flatOpacity === 'number' ? flatOpacity : 1;

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: baseOpacity * (1 - pressed.value * (1 - activeOpacity)),
    transform: [{ scale: 1 - pressed.value * (1 - pressedScale) }],
  }));

  const handlePressIn = (e: GestureResponderEvent) => {
    pressed.value = withTiming(1, QUICK_TIMING);
    onPressIn?.(e);
  };

  const handlePressOut = (e: GestureResponderEvent) => {
    pressed.value = withSpring(0, PRESS_SPRING);
    onPressOut?.(e);
  };

  return (
    <AnimatedPressable
      {...rest}
      accessibilityRole={rest.accessibilityRole ?? 'button'}
      disabled={disabled}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[style, animatedStyle]}
    >
      {children}
    </AnimatedPressable>
  );
};
