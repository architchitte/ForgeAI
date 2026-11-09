import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PressableScale } from '../../../components/animation/PressableScale';
import { ArrowLeftIcon } from '../../../components/common/AppIcons';
import { Avatar } from '../../../components/common/Avatar';
import { STITCH_COLORS } from '../../../constants/theme';
import { FONTS } from '../../../constants/typography';

interface ChatTopBarProps {
  onBack: () => void;
  backLabel?: string;
  title?: string;
  subtitle?: string | null;
  /** Shows an avatar next to the title (conversation header). */
  avatar?: { uri: string | null; name: string } | null;
  right?: React.ReactNode;
}

/** Back bar used by the chat screens (same treatment as the profile page). */
export const ChatTopBar: React.FC<ChatTopBarProps> = ({
  onBack,
  backLabel = 'Back',
  title,
  subtitle,
  avatar,
  right,
}) => (
  <View style={styles.bar}>
    <PressableScale
      style={styles.back}
      onPress={onBack}
      activeOpacity={0.7}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      accessibilityLabel={backLabel}
    >
      <ArrowLeftIcon size={18} color={STITCH_COLORS.primary} />
      {!title && <Text style={styles.backText}>{backLabel}</Text>}
    </PressableScale>

    {title ? (
      <View style={styles.identity} accessible accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}>
        {avatar && <Avatar uri={avatar.uri} name={avatar.name} size={34} />}
        <View style={styles.titles}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
        </View>
      </View>
    ) : (
      <View style={styles.flex} />
    )}

    {right}
  </View>
);

const styles = StyleSheet.create({
  flex: { flex: 1 },
  bar: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: STITCH_COLORS.surfaceContainerLowest,
    borderBottomWidth: 1,
    borderBottomColor: '#171717',
  },
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingRight: 4,
  },
  backText: { fontSize: 13, fontFamily: FONTS.sans.semibold, color: STITCH_COLORS.onSurface },
  identity: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 10 },
  titles: { flex: 1, minWidth: 0 },
  title: { fontSize: 15, fontFamily: FONTS.sans.semibold, color: '#FFFFFF', letterSpacing: -0.2 },
  subtitle: { marginTop: 1, fontSize: 12, fontFamily: FONTS.sans.regular, color: STITCH_COLORS.onSurfaceVariant },
});
