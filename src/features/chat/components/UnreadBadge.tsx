import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { STITCH_COLORS } from '../../../constants/theme';
import { FONTS } from '../../../constants/typography';

interface UnreadBadgeProps {
  count: number;
  /** Ring matching the surface behind it, for badges overlapping an icon. */
  ringColor?: string;
  style?: StyleProp<ViewStyle>;
}

/** Monochrome count pill; renders nothing at zero. */
export const UnreadBadge: React.FC<UnreadBadgeProps> = React.memo(({ count, ringColor, style }) => {
  if (count <= 0) return null;
  const label = count > 99 ? '99+' : String(count);
  return (
    <View
      style={[styles.badge, ringColor ? { borderWidth: 2, borderColor: ringColor } : null, style]}
      accessibilityLabel={`${count} unread ${count === 1 ? 'message' : 'messages'}`}
    >
      <Text style={styles.text}>{label}</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  badge: {
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: 9,
    backgroundColor: STITCH_COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 10.5,
    lineHeight: 13,
    fontFamily: FONTS.mono.semibold,
    color: STITCH_COLORS.onPrimary,
  },
});
