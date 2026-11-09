import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { STITCH_COLORS } from '../../../constants/theme';
import { FONTS } from '../../../constants/typography';

const DateSeparatorBase: React.FC<{ label: string }> = ({ label }) => (
  <View style={styles.row} accessibilityRole="header">
    <View style={styles.line} />
    <Text style={styles.label}>{label}</Text>
    <View style={styles.line} />
  </View>
);

export const DateSeparator = React.memo(DateSeparatorBase);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 24,
    marginTop: 18,
    marginBottom: 6,
  },
  line: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: '#262626' },
  label: {
    fontSize: 11,
    fontFamily: FONTS.mono.medium,
    color: STITCH_COLORS.outline,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
});
