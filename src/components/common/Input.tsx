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

interface InputProps {
  label: string;
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
  containerStyle,
}) => {
  const [hidePassword, setHidePassword] = useState<boolean>(isPassword);

  return (
    <View style={[styles.container, containerStyle]}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {rightLabel ? (
          <Text style={styles.rightLabel}>{rightLabel}</Text>
        ) : null}
      </View>
      <View
        style={[
          styles.inputWrapper,
          multiline && styles.multilineWrapper,
          error ? styles.inputError : null,
        ]}
      >
        <TextInput
          style={[styles.input, multiline && styles.multilineInput]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#94A3B8"
          secureTextEntry={isPassword ? hidePassword : secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          testID={testID}
          multiline={multiline}
          numberOfLines={numberOfLines}
          maxLength={maxLength}
          textAlignVertical={multiline ? 'top' : 'center'}
        />
        {isPassword && (
          <TouchableOpacity
            style={styles.toggleButton}
            onPress={() => setHidePassword((prev) => !prev)}
            activeOpacity={0.7}
          >
            <Text style={styles.toggleText}>
              {hidePassword ? 'Show' : 'Hide'}
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
    marginBottom: 16,
    width: '100%',
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  rightLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 14,
    minHeight: 50,
  },
  multilineWrapper: {
    alignItems: 'flex-start',
    minHeight: 120,
    paddingVertical: 10,
  },
  inputError: {
    borderColor: '#EF4444',
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#0F172A',
    paddingVertical: 12,
  },
  multilineInput: {
    height: '100%',
    paddingVertical: 4,
    lineHeight: 22,
  },
  toggleButton: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  toggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563EB',
  },
  errorText: {
    marginTop: 4,
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '500',
  },
  helperText: {
    marginTop: 4,
    fontSize: 12,
    color: '#64748B',
  },
});
