import React, { useEffect } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { QUICK_TIMING } from './motion';

// Existing ForgeAI field border colours (unchanged): idle, focused, error.
export const FIELD_BORDER_IDLE = '#262626';
export const FIELD_BORDER_FOCUSED = '#FFFFFF';
export const FIELD_BORDER_ERROR = '#737373';

export interface FocusBorderViewProps {
  focused: boolean;
  /** When true the error colour wins over focus, matching the previous behaviour. */
  hasError?: boolean;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

/**
 * Field container whose border colour transitions smoothly between the
 * idle and focused colours instead of switching instantly.
 */
export const FocusBorderView: React.FC<FocusBorderViewProps> = ({
  focused,
  hasError = false,
  style,
  children,
}) => {
  const progress = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(focused ? 1 : 0, QUICK_TIMING);
  }, [focused, progress]);

  const borderStyle = useAnimatedStyle(() => ({
    borderColor: hasError
      ? FIELD_BORDER_ERROR
      : interpolateColor(
          progress.value,
          [0, 1],
          [FIELD_BORDER_IDLE, FIELD_BORDER_FOCUSED]
        ),
  }));

  return <Animated.View style={[style, borderStyle]}>{children}</Animated.View>;
};
