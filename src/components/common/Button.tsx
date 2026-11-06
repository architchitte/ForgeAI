import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
  StyleProp,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { STITCH_COLORS } from '../../constants/theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'google' | 'outline';
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  icon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  testID?: string;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
  textStyle,
  icon,
  rightIcon,
  testID,
}) => {
  const isGoogle = variant === 'google';
  const isOutline = variant === 'outline';
  const isSecondary = variant === 'secondary';

  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      style={[
        styles.base,
        isGoogle && styles.googleButton,
        isOutline && styles.outlineButton,
        isSecondary && styles.secondaryButton,
        isDisabled && styles.disabledButton,
        style,
      ]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
      testID={testID}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={isOutline ? STITCH_COLORS.primary : '#FFFFFF'}
        />
      ) : (
        <View style={styles.contentRow}>
          {icon ? <View style={styles.iconContainer}>{icon}</View> : null}
          {isGoogle && (
            <View style={styles.googleIconContainer}>
              <View style={styles.googleBadge}>
                <Text style={styles.googleLetter}>G</Text>
              </View>
            </View>
          )}
          <Text
            style={[
              styles.text,
              isGoogle && styles.googleText,
              isOutline && styles.outlineText,
              isSecondary && styles.secondaryText,
              textStyle,
            ]}
          >
            {title}
          </Text>
          {rightIcon ? <View style={styles.rightIconContainer}>{rightIcon}</View> : null}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: STITCH_COLORS.primaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginVertical: 6,
    width: '100%',
    shadowColor: STITCH_COLORS.primaryContainer,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  googleButton: {
    backgroundColor: STITCH_COLORS.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  secondaryButton: {
    backgroundColor: STITCH_COLORS.surfaceContainer,
    borderWidth: 1,
    borderColor: STITCH_COLORS.surfaceContainerHighest,
    shadowOpacity: 0,
    elevation: 0,
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: STITCH_COLORS.outlineVariant,
    shadowOpacity: 0,
    elevation: 0,
  },
  disabledButton: {
    opacity: 0.5,
    shadowOpacity: 0,
    elevation: 0,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginRight: 8,
  },
  rightIconContainer: {
    marginLeft: 8,
  },
  googleIconContainer: {
    marginRight: 10,
  },
  googleBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleLetter: {
    fontSize: 13,
    fontWeight: '800',
    color: '#4285F4',
  },
  text: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  googleText: {
    color: STITCH_COLORS.onSurface,
    fontWeight: '600',
  },
  secondaryText: {
    color: STITCH_COLORS.secondary,
    fontWeight: '600',
  },
  outlineText: {
    color: STITCH_COLORS.primary,
    fontWeight: '600',
  },
});
