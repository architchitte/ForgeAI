import React, { useEffect, useRef } from 'react';
import {
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
  StyleProp,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { STITCH_COLORS } from '../../constants/theme';
import { FONTS } from '../../constants/typography';
import { PressableScale } from '../animation/PressableScale';
import { FadeInView } from '../animation/FadeInView';

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

  // Only cross-fade on loading changes, not on the button's first render.
  const hasMounted = useRef(false);
  useEffect(() => {
    hasMounted.current = true;
  }, []);
  const skipFade = !hasMounted.current;

  return (
    <PressableScale
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
      accessibilityState={{ disabled: isDisabled, busy: loading }}
    >
      {loading ? (
        <FadeInView key="loading" offset={0} disabled={skipFade}>
          <ActivityIndicator
            size="small"
            color={isOutline || isGoogle || isSecondary ? '#FFFFFF' : '#000000'}
          />
        </FadeInView>
      ) : (
        <FadeInView key="content" offset={0} disabled={skipFade} style={styles.contentRow}>
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
        </FadeInView>
      )}
    </PressableScale>
  );
};

const styles = StyleSheet.create({
  base: {
    minHeight: 46,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginVertical: 6,
    width: '100%',
  },
  googleButton: {
    backgroundColor: '#0A0A0A',
    borderWidth: 1,
    borderColor: '#333333',
  },
  secondaryButton: {
    backgroundColor: '#000000',
    borderWidth: 1,
    borderColor: '#333333',
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#333333',
  },
  disabledButton: {
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: '#262626',
    opacity: 0.6,
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
    backgroundColor: '#1F1F1F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleLetter: {
    fontSize: 12,
    fontFamily: FONTS.sans.semibold,
    color: '#FFFFFF',
  },
  text: {
    fontSize: 14,
    fontFamily: FONTS.sans.semibold,
    color: '#000000',
    letterSpacing: -0.2,
  },
  googleText: {
    color: '#EDEDED',
    fontFamily: FONTS.sans.medium,
  },
  secondaryText: {
    color: '#EDEDED',
    fontFamily: FONTS.sans.medium,
  },
  outlineText: {
    color: '#EDEDED',
    fontFamily: FONTS.sans.medium,
  },
});
