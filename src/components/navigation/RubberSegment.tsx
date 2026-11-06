import React, { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Animated,
  PanResponder,
  LayoutChangeEvent,
  StyleProp,
  ViewStyle,
  TextStyle,
  Platform,
  GestureResponderEvent,
  PanResponderGestureState,
} from 'react-native';
import Reanimated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { STITCH_COLORS } from '../../constants/theme';
import { FONTS } from '../../constants/typography';
import { PRESS_SPRING, QUICK_TIMING } from '../animation/motion';

/**
 * Icon wrapper: gives a small one-off "pop" when its tab becomes active.
 * The resting scale is always 1, so the dock's static look is unchanged.
 */
const SlotIcon: React.FC<{ isActive: boolean; children: React.ReactNode }> = ({
  isActive,
  children,
}) => {
  const scale = useSharedValue(1);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (isActive) {
      scale.value = withSequence(
        withTiming(1.08, QUICK_TIMING),
        withSpring(1, PRESS_SPRING)
      );
    }
  }, [isActive, scale]);

  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return <Reanimated.View style={[styles.iconContainer, style]}>{children}</Reanimated.View>;
};

/** Label whose colour cross-fades between the existing inactive/active colours. */
const SlotLabel: React.FC<{
  isActive: boolean;
  textColor: string;
  activeTextColor: string;
  fontSize: number;
  children: React.ReactNode;
}> = ({ isActive, textColor, activeTextColor, fontSize, children }) => {
  const progress = useSharedValue(isActive ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(isActive ? 1 : 0, QUICK_TIMING);
  }, [isActive, progress]);

  const colorStyle = useAnimatedStyle(() => ({
    color: interpolateColor(progress.value, [0, 1], [textColor, activeTextColor]),
  }));

  return (
    <Reanimated.Text
      style={[
        styles.slotLabel,
        { fontSize, fontFamily: isActive ? FONTS.sans.semibold : FONTS.sans.medium },
        colorStyle,
      ]}
      numberOfLines={1}
    >
      {children}
    </Reanimated.Text>
  );
};

export interface RubberSegmentItemObject {
  value: string;
  label: React.ReactNode;
  icon?: React.ReactNode | ((isActive: boolean) => React.ReactNode);
}

export type RubberSegmentItemInput = string | RubberSegmentItemObject;

export interface RubberSegmentProps {
  items: RubberSegmentItemInput[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string, index: number) => void;
  trackColor?: string;
  thumbColor?: string;
  textColor?: string;
  activeTextColor?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  height?: number;
  radius?: number;
  inset?: number;
  equalSlots?: boolean;
  stretch?: number;
  squash?: number;
  speed?: number;
  glide?: number;
  draggable?: boolean;
  disabled?: boolean;
  className?: string;
  style?: StyleProp<ViewStyle>;
  'aria-label'?: string;
}

const SIZES = {
  sm: { height: 32, font: 11, pad: 8, iconSize: 14 },
  md: { height: 42, font: 12, pad: 10, iconSize: 18 },
  lg: { height: 50, font: 13, pad: 12, iconSize: 20 },
  xl: { height: 60, font: 11, pad: 4, iconSize: 22 },
};

const clamp = (val: number, min: number, max: number) =>
  Math.min(max, Math.max(min, val));

/**
 * RubberSegment component ported and optimized for React Native & Expo.
 * Implements elastic dilation (stretch) and trailing snap (squash)
 * spring animations when switching segments or dragging across tabs.
 */
export const RubberSegment: React.FC<RubberSegmentProps> = ({
  items,
  value,
  defaultValue,
  onChange,
  trackColor = '#ffffff',
  thumbColor = STITCH_COLORS.surfaceContainerLow,
  textColor = STITCH_COLORS.outline,
  activeTextColor = STITCH_COLORS.primaryContainer,
  size = 'xl',
  height: customHeight,
  radius = 22,
  inset = 4,
  equalSlots = true,
  stretch = 100,
  squash = 3,
  speed = 1,
  glide = 75,
  draggable = true,
  disabled = false,
  style,
}) => {
  // Normalize items to consistent object format
  const list: RubberSegmentItemObject[] = items.map((item) =>
    typeof item === 'string' ? { value: item, label: item } : item
  );

  const [innerValue, setInnerValue] = useState<string>(
    defaultValue ?? list[0]?.value ?? ''
  );
  const currentValue = value !== undefined ? value : innerValue;
  const activeIndex = Math.max(
    0,
    list.findIndex((item) => item.value === currentValue)
  );

  const [trackWidth, setTrackWidth] = useState<number>(0);
  const committedIndex = useRef<number>(activeIndex);

  // Animated values for the elastic rubber thumb edges
  const edgeLeft = useRef(new Animated.Value(0)).current;
  const edgeRight = useRef(new Animated.Value(0)).current;

  // Numerical tracks of animated values for type-safe gesture calculations
  const currentLeftRef = useRef<number>(0);
  const currentRightRef = useRef<number>(0);

  useEffect(() => {
    const idL = edgeLeft.addListener(({ value }) => {
      currentLeftRef.current = value;
    });
    const idR = edgeRight.addListener(({ value }) => {
      currentRightRef.current = value;
    });
    return () => {
      edgeLeft.removeListener(idL);
      edgeRight.removeListener(idR);
    };
  }, [edgeLeft, edgeRight]);

  // Track gesture state
  const isDragging = useRef<boolean>(false);
  const dragStartX = useRef<number>(0);
  const dragInitialLeft = useRef<number>(0);
  const dragInitialRight = useRef<number>(0);

  const preset = SIZES[size] || SIZES.xl;
  const effectiveHeight = customHeight ?? preset.height;
  const thumbRadius = Math.max(0, radius - inset);
  const availableWidth = Math.max(0, trackWidth - inset * 2);
  const slotCount = Math.max(1, list.length);
  const slotWidth = availableWidth / slotCount;

  /**
   * Instantly reposition thumb without animation (e.g. layout updates)
   */
  const jumpTo = useCallback(
    (index: number) => {
      if (trackWidth <= 0) return;
      const targetLeft = index * slotWidth;
      const targetRight = (index + 1) * slotWidth;
      edgeLeft.setValue(targetLeft);
      edgeRight.setValue(targetRight);
    },
    [trackWidth, slotWidth, edgeLeft, edgeRight]
  );

  /**
   * Elastic Rubber transition between slots.
   * Dilates the leading edge ahead of the trailing edge to produce
   * the signature rubber stretch, then snaps and squashes into place.
   */
  const animateTo = useCallback(
    (fromIdx: number, toIdx: number, flick = false) => {
      if (trackWidth <= 0 || toIdx < 0 || toIdx >= list.length) return;

      const targetLeft = toIdx * slotWidth;
      const targetRight = (toIdx + 1) * slotWidth;

      if (fromIdx === toIdx) {
        Animated.parallel([
          Animated.spring(edgeLeft, {
            toValue: targetLeft,
            friction: 7 / speed,
            tension: 120 * speed,
            useNativeDriver: false,
          }),
          Animated.spring(edgeRight, {
            toValue: targetRight,
            friction: 7 / speed,
            tension: 120 * speed,
            useNativeDriver: false,
          }),
        ]).start();
        return;
      }

      const movingRight = toIdx > fromIdx;
      const stretchFactor = Math.min(1.5, Math.max(0, stretch / 100));

      if (movingRight) {
        // Right edge leads forward (dilating the thumb)
        Animated.spring(edgeRight, {
          toValue: targetRight + (flick ? squash : 0),
          friction: (6.5 / speed) / (1 + stretchFactor * 0.2),
          tension: 130 * speed,
          useNativeDriver: false,
        }).start(() => {
          if (flick && squash > 0) {
            Animated.spring(edgeRight, {
              toValue: targetRight,
              friction: 6 / speed,
              tension: 140 * speed,
              useNativeDriver: false,
            }).start();
          }
        });

        // Left edge trails behind with slight delay to create the rubber stretch
        Animated.sequence([
          Animated.delay(Math.max(15, 38 / speed)),
          Animated.spring(edgeLeft, {
            toValue: targetLeft,
            friction: 7.5 / speed,
            tension: 110 * speed,
            useNativeDriver: false,
          }),
        ]).start();
      } else {
        // Left edge leads backward (dilating to the left)
        Animated.spring(edgeLeft, {
          toValue: targetLeft - (flick ? squash : 0),
          friction: (6.5 / speed) / (1 + stretchFactor * 0.2),
          tension: 130 * speed,
          useNativeDriver: false,
        }).start(() => {
          if (flick && squash > 0) {
            Animated.spring(edgeLeft, {
              toValue: targetLeft,
              friction: 6 / speed,
              tension: 140 * speed,
              useNativeDriver: false,
            }).start();
          }
        });

        // Right edge trails behind
        Animated.sequence([
          Animated.delay(Math.max(15, 38 / speed)),
          Animated.spring(edgeRight, {
            toValue: targetRight,
            friction: 7.5 / speed,
            tension: 110 * speed,
            useNativeDriver: false,
          }),
        ]).start();
      }
    },
    [trackWidth, list.length, slotWidth, speed, stretch, squash, edgeLeft, edgeRight]
  );

  // Commit change and notify parent
  const commit = useCallback(
    (index: number) => {
      committedIndex.current = index;
      const targetItem = list[index];
      if (!targetItem) return;

      if (value === undefined) {
        setInnerValue(targetItem.value);
      }
      onChange?.(targetItem.value, index);
    },
    [list, value, onChange]
  );

  // Handle external value changes
  useEffect(() => {
    if (!isDragging.current && committedIndex.current !== activeIndex) {
      const prev = committedIndex.current;
      committedIndex.current = activeIndex;
      animateTo(prev, activeIndex, false);
    }
  }, [activeIndex, animateTo]);

  // Initial layout measure
  const handleLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && Math.abs(w - trackWidth) > 1) {
      setTrackWidth(w);
      const curLeft = activeIndex * ((w - inset * 2) / slotCount);
      const curRight = (activeIndex + 1) * ((w - inset * 2) / slotCount);
      edgeLeft.setValue(curLeft);
      edgeRight.setValue(curRight);
    }
  };

  const handleTap = (index: number) => {
    if (disabled || isDragging.current) return;
    if (index === committedIndex.current) return;
    const prev = committedIndex.current;
    commit(index);
    animateTo(prev, index, false);
  };

  // PanResponder for drag and flick interaction
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => draggable && !disabled,
      onMoveShouldSetPanResponder: (_, gestureState: PanResponderGestureState) =>
        draggable && !disabled && Math.abs(gestureState.dx) > 6,

      onPanResponderGrant: (
        e: GestureResponderEvent,
        gestureState: PanResponderGestureState
      ) => {
        if (!draggable || disabled || trackWidth <= 0) return;
        isDragging.current = true;
        dragStartX.current = gestureState.x0;
        dragInitialLeft.current = currentLeftRef.current || committedIndex.current * slotWidth;
        dragInitialRight.current =
          currentRightRef.current || (committedIndex.current + 1) * slotWidth;
      },

      onPanResponderMove: (
        _,
        gestureState: PanResponderGestureState
      ) => {
        if (!isDragging.current || trackWidth <= 0) return;
        const dx = gestureState.dx;
        const width = slotWidth;
        const maxL = availableWidth - width;

        let nextL = dragInitialLeft.current + dx;

        // Rubber-band resistance if dragged past borders
        if (nextL < 0) {
          nextL = nextL * 0.35;
        } else if (nextL > maxL) {
          nextL = maxL + (nextL - maxL) * 0.35;
        }

        const nextR = nextL + width;
        edgeLeft.setValue(nextL);
        edgeRight.setValue(nextR);
      },

      onPanResponderRelease: (
        _,
        gestureState: PanResponderGestureState
      ) => {
        if (!isDragging.current) return;
        isDragging.current = false;

        const vx = gestureState.vx;
        const isFlick = Math.abs(vx) > 0.35;
        const currentCenter =
          (currentLeftRef.current + currentRightRef.current) / 2 ||
          (committedIndex.current + 0.5) * slotWidth;
        const projectedCenter = currentCenter + vx * (glide * 1.5);

        let targetIndex = Math.round(projectedCenter / slotWidth);
        if (isFlick && targetIndex === committedIndex.current) {
          targetIndex = clamp(
            committedIndex.current + Math.sign(vx),
            0,
            list.length - 1
          );
        } else {
          targetIndex = clamp(targetIndex, 0, list.length - 1);
        }

        const prev = committedIndex.current;
        commit(targetIndex);
        animateTo(prev, targetIndex, isFlick);
      },

      onPanResponderTerminate: () => {
        isDragging.current = false;
        animateTo(committedIndex.current, committedIndex.current, false);
      },
    })
  ).current;

  // Derived animated width and left position
  const thumbLeft = Animated.add(edgeLeft, inset);
  const thumbWidth = Animated.subtract(edgeRight, edgeLeft);

  return (
    <View
      style={[
        styles.track,
        {
          backgroundColor: trackColor,
          borderRadius: radius,
          height: effectiveHeight,
          padding: inset,
        },
        disabled && styles.disabledTrack,
        style,
      ]}
      onLayout={handleLayout}
      {...(draggable && !disabled ? panResponder.panHandlers : {})}
    >
      {/* Elastic Rubber Thumb */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.thumb,
          {
            backgroundColor: thumbColor,
            borderRadius: thumbRadius,
            top: inset,
            bottom: inset,
            left: thumbLeft,
            width: thumbWidth,
          },
        ]}
      />

      {/* Segment Slots */}
      <View style={styles.slotsRow}>
        {list.map((item, index) => {
          const isActive = index === activeIndex;

          return (
            <TouchableOpacity
              key={item.value}
              style={[
                styles.slot,
                equalSlots && styles.equalSlot,
                { borderRadius: thumbRadius },
              ]}
              onPress={() => handleTap(index)}
              activeOpacity={0.7}
              disabled={disabled}
            >
              {item.icon && (
                <SlotIcon isActive={isActive}>
                  {typeof item.icon === 'function'
                    ? item.icon(isActive)
                    : item.icon}
                </SlotIcon>
              )}
              {item.label && (
                <SlotLabel
                  isActive={isActive}
                  textColor={textColor}
                  activeTextColor={activeTextColor}
                  fontSize={preset.font}
                >
                  {item.label}
                </SlotLabel>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

export default RubberSegment;

const styles = StyleSheet.create({
  track: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: STITCH_COLORS.borderSubtle,
    overflow: 'hidden',
  },
  disabledTrack: {
    opacity: 0.5,
  },
  thumb: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: STITCH_COLORS.borderStrong,
  },
  slotsRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'stretch',
    height: '100%',
    zIndex: 2,
  },
  slot: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  equalSlot: {
    flex: 1,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  slotLabel: {
    letterSpacing: 0.2,
    textAlign: 'center',
  },
});
