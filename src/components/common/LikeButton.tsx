import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { STITCH_COLORS } from '../../constants/theme';
import { FONTS } from '../../constants/typography';
import { HeartIcon } from './AppIcons';
import { PressableScale } from '../animation/PressableScale';

interface LikeButtonProps {
  repositoryId: string;
  /** Undefined until like state has loaded. */
  count?: number;
  liked: boolean;
  pending: boolean;
  onToggle: (repositoryId: string) => void;
  /** `compact` = feed card pill, `large` = detail action bar button. */
  variant?: 'compact' | 'large';
}

/**
 * Heart + like count. Never `disabled`: on a card, a disabled inner Pressable
 * would let the tap fall through and open the card. Taps while pending or
 * before state has loaded are ignored by the likes store instead.
 */
export const LikeButton: React.FC<LikeButtonProps> = ({
  repositoryId,
  count,
  liked,
  pending,
  onToggle,
  variant = 'compact',
}) => {
  const unknown = count === undefined;
  const large = variant === 'large';
  const a11yLabel = unknown
    ? 'Likes loading'
    : `${liked ? 'Unlike' : 'Like'} project, ${count} ${count === 1 ? 'like' : 'likes'}`;

  return (
    <PressableScale
      style={[
        large ? styles.large : styles.compact,
        liked && styles.active,
        unknown && styles.unknown,
      ]}
      onPress={() => onToggle(repositoryId)}
      activeOpacity={0.7}
      pressedScale={large ? 0.95 : 0.9}
      hitSlop={large ? undefined : { top: 8, bottom: 8, left: 6, right: 6 }}
      accessibilityLabel={a11yLabel}
      accessibilityState={{ selected: liked, busy: pending, disabled: unknown }}
      testID={`like-button-${repositoryId}`}
    >
      <HeartIcon
        size={large ? 18 : 14}
        filled={liked}
        color={liked ? '#FFFFFF' : STITCH_COLORS.onSurfaceVariant}
      />
      {/* Min width keeps the button from jumping as the count changes */}
      <Text
        style={[large ? styles.countLarge : styles.countCompact, liked && styles.countActive]}
      >
        {unknown ? '–' : count}
      </Text>
    </PressableScale>
  );
};

const styles = StyleSheet.create({
  compact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#262626',
    backgroundColor: '#000000',
  },
  large: {
    height: 46,
    minWidth: 72,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: 14,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#333333',
    backgroundColor: '#0A0A0A',
  },
  active: {
    borderColor: '#454545',
    backgroundColor: '#171717',
  },
  unknown: {
    opacity: 0.5,
  },
  countCompact: {
    minWidth: 10,
    fontSize: 11,
    fontFamily: FONTS.mono.medium,
    color: STITCH_COLORS.onSurfaceVariant,
  },
  countLarge: {
    minWidth: 14,
    fontSize: 14,
    fontFamily: FONTS.mono.medium,
    color: STITCH_COLORS.onSurfaceVariant,
  },
  countActive: {
    color: '#FFFFFF',
  },
});
