import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PressableScale } from '../../../components/animation/PressableScale';
import { STITCH_COLORS } from '../../../constants/theme';
import { FONTS } from '../../../constants/typography';

interface ChatEmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const ChatEmptyState: React.FC<ChatEmptyStateProps> = ({ icon, title, message, actionLabel, onAction }) => (
  <View style={styles.box}>
    {icon ? <View style={styles.iconBox}>{icon}</View> : null}
    <Text style={styles.title}>{title}</Text>
    <Text style={styles.message}>{message}</Text>
    {actionLabel && onAction ? (
      <PressableScale style={styles.action} onPress={onAction} activeOpacity={0.85} accessibilityLabel={actionLabel}>
        <Text style={styles.actionText}>{actionLabel}</Text>
      </PressableScale>
    ) : null}
  </View>
);

const styles = StyleSheet.create({
  box: { marginTop: 56, alignItems: 'center', paddingHorizontal: 32, gap: 6 },
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#262626',
    backgroundColor: '#0A0A0A',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  title: { fontSize: 15, fontFamily: FONTS.sans.semibold, color: '#EDEDED', textAlign: 'center' },
  message: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: FONTS.sans.regular,
    color: STITCH_COLORS.outline,
    textAlign: 'center',
  },
  action: {
    marginTop: 14,
    paddingHorizontal: 16,
    height: 38,
    borderRadius: 8,
    backgroundColor: STITCH_COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: { fontSize: 13.5, fontFamily: FONTS.sans.semibold, color: STITCH_COLORS.onPrimary },
});
