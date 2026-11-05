import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
  StyleProp,
  ViewStyle,
} from 'react-native';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'google' | 'outline';
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
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
          color={isGoogle || isOutline ? '#2563EB' : '#FFFFFF'}
        />
      ) : (
        <View style={styles.contentRow}>
          {isGoogle && (
            <View style={styles.googleIconBadge}>
              <Text style={styles.googleIconText}>G</Text>
            </View>
          )}
          <Text
            style={[
              styles.text,
              isGoogle && styles.googleText,
              isOutline && styles.outlineText,
              isSecondary && styles.secondaryText,
            ]}
          >
            {title}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    minHeight: 50,
    borderRadius: 10,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginVertical: 6,
    width: '100%',
  },
  googleButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#2563EB',
  },
  secondaryButton: {
    backgroundColor: '#0F172A',
  },
  disabledButton: {
    opacity: 0.6,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleIconBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#4285F4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  googleIconText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  googleText: {
    color: '#1E293B',
    fontWeight: '600',
  },
  outlineText: {
    color: '#2563EB',
  },
  secondaryText: {
    color: '#FFFFFF',
  },
});

