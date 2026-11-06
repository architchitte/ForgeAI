import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardTypeOptions,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { STITCH_COLORS } from '../../constants/theme';

interface InputProps {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  error?: string | null;
  isPassword?: boolean;
  testID?: string;
  multiline?: boolean;
  numberOfLines?: number;
  maxLength?: number;
  rightLabel?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
}

export const Input: React.FC<InputProps> = ({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'none',
  error,
  isPassword = false,
  testID,
  multiline = false,
  numberOfLines,
  maxLength,
  rightLabel,
  helperText,
  leftIcon,
  containerStyle,
}) => {
  const [hidePassword, setHidePassword] = useState<boolean>(isPassword);
  const [isFocused, setIsFocused] = useState<boolean>(false);

  return (
    <View style={[styles.container, containerStyle]}>
      {label || rightLabel ? (
        <View style={styles.labelRow}>
          {label ? <Text style={styles.label}>{label}</Text> : <View />}
          {rightLabel ? (
            <Text style={styles.rightLabel}>{rightLabel}</Text>
          ) : null}
        </View>
      ) : null}
      <View
        style={[
          styles.inputWrapper,
          multiline && styles.multilineWrapper,
          isFocused && styles.inputFocused,
          error ? styles.inputError : null,
        ]}
      >
        {leftIcon ? <View style={styles.leftIconContainer}>{leftIcon}</View> : null}
        <TextInput
          style={[styles.input, multiline && styles.multilineInput]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={STITCH_COLORS.outline}
          secureTextEntry={isPassword ? hidePassword : secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          testID={testID}
          multiline={multiline}
          numberOfLines={numberOfLines}
          maxLength={maxLength}
          textAlignVertical={multiline ? 'top' : 'center'}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />
        {isPassword && (
          <TouchableOpacity
            style={styles.toggleButton}
            onPress={() => setHidePassword((prev) => !prev)}
            activeOpacity={0.7}
          >
            <Text style={styles.toggleText}>
              {hidePassword ? 'SHOW' : 'HIDE'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : helperText ? (
        <Text style={styles.helperText}>{helperText}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 6,
    width: '100%',
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: STITCH_COLORS.onSurface,
    letterSpacing: -0.1,
  },
  rightLabel: {
    fontSize: 11,
    color: STITCH_COLORS.secondary,
    fontWeight: '600',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: STITCH_COLORS.surfaceContainerLowest, // #ffffff
    borderWidth: 1,
    borderColor: STITCH_COLORS.surfaceContainerHighest,   // #dae2fd
    borderRadius: 8,
    paddingHorizontal: 12,
    minHeight: 46,
  },
  multilineWrapper: {
    minHeight: 110,
    alignItems: 'flex-start',
    paddingVertical: 10,
  },
  inputFocused: {
    borderColor: STITCH_COLORS.primaryContainer, // #4f46e5
  },
  inputError: {
    borderColor: STITCH_COLORS.error,
  },
  leftIconContainer: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    color: STITCH_COLORS.onSurface,
    fontSize: 13.5,
    paddingVertical: 10,
  },
  multilineInput: {
    minHeight: 90,
  },
  toggleButton: {
    paddingLeft: 8,
    paddingVertical: 4,
  },
  toggleText: {
    fontSize: 10,
    fontWeight: '800',
    color: STITCH_COLORS.secondary,
    letterSpacing: 0.5,
  },
  errorText: {
    marginTop: 4,
    fontSize: 12,
    color: STITCH_COLORS.error,
    fontWeight: '500',
  },
  helperText: {
    marginTop: 4,
    fontSize: 11,
    color: STITCH_COLORS.outline,
  },
});
