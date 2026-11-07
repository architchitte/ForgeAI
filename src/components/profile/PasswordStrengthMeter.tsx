import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FONTS } from '../../constants/typography';
import {
  PASSWORD_RULES,
  STRENGTH_LABELS,
  passwordStrength,
} from '../../constants/password';
import { CheckIcon } from '../common/AppIcons';

/** Four-segment strength bar + the rule checklist (monochrome). */
export const PasswordStrengthMeter: React.FC<{ password: string }> = ({ password }) => {
  const score = passwordStrength(password);
  if (!password) return null;
  return (
    <View style={styles.wrap} accessibilityLabel={`Password strength: ${STRENGTH_LABELS[score]}`}>
      <View style={styles.barRow}>
        {[1, 2, 3, 4].map((i) => (
          <View key={i} style={[styles.segment, i <= score && styles.segmentOn]} />
        ))}
        <Text style={styles.label}>{STRENGTH_LABELS[score]}</Text>
      </View>
      <View style={styles.rules}>
        {PASSWORD_RULES.map((rule) => {
          const ok = rule.test(password);
          return (
            <View key={rule.id} style={styles.ruleRow}>
              <View style={[styles.ruleDot, ok && styles.ruleDotOn]}>
                {ok && <CheckIcon size={9} color="#000000" />}
              </View>
              <Text style={[styles.ruleText, ok && styles.ruleTextOn]}>{rule.label}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    marginTop: 4,
    marginBottom: 8,
    gap: 8,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  segment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#262626',
  },
  segmentOn: {
    backgroundColor: '#FFFFFF',
  },
  label: {
    minWidth: 64,
    marginLeft: 6,
    textAlign: 'right',
    fontSize: 11,
    fontFamily: FONTS.sans.medium,
    color: '#A1A1A1',
  },
  rules: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 14,
    rowGap: 4,
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  ruleDot: {
    width: 13,
    height: 13,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: '#454545',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ruleDotOn: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  ruleText: {
    fontSize: 11,
    fontFamily: FONTS.sans.regular,
    color: '#737373',
  },
  ruleTextOn: {
    color: '#D4D4D4',
  },
});
