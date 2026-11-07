import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { STITCH_COLORS } from '../../constants/theme';
import { FONTS } from '../../constants/typography';
import { PASSWORD_MAX, validateNewPassword } from '../../constants/password';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { PressableScale } from '../../components/animation/PressableScale';
import { PasswordStrengthMeter } from '../../components/profile/PasswordStrengthMeter';

/**
 * Shown after opening a password-recovery link (AuthContext.passwordRecovery).
 * The recovery link already authenticated this session, so only the new
 * password is asked for. Cancel signs out without changing anything.
 */
export const ResetPasswordScreen: React.FC = () => {
  const { user, changePassword, cancelPasswordRecovery } = useAuth();
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const nextError = submitted || next.length > 0 ? validateNewPassword(next, next) : null;
  const confirmError =
    (submitted || confirm.length > 0) && confirm !== next ? 'Passwords do not match.' : null;

  const handleSave = async () => {
    setSubmitted(true);
    setServerError(null);
    if (validateNewPassword(next, confirm)) return;
    setSaving(true);
    try {
      await changePassword(null, next);
      Alert.alert('Password updated', 'Your new password is set. You are now signed in.');
    } catch (err: any) {
      setServerError(err?.message || 'Failed to set your new password.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.brand}>
            Forge<Text style={styles.brandAccent}>AI</Text>
          </Text>
          <Text style={styles.title}>Set a new password</Text>
          <Text style={styles.subtitle}>
            {user?.email ? `For ${user.email}. ` : ''}Choose a strong password you haven't used
            here before.
          </Text>

          <View style={styles.card}>
            {serverError && <Text style={styles.serverError}>{serverError}</Text>}
            <Input
              label="New password"
              value={next}
              onChangeText={(t) => {
                setNext(t);
                setServerError(null);
              }}
              isPassword
              maxLength={PASSWORD_MAX}
              error={nextError && nextError !== 'Passwords do not match.' ? nextError : null}
              testID="reset-new-password-input"
            />
            <PasswordStrengthMeter password={next} />
            <Input
              label="Confirm new password"
              value={confirm}
              onChangeText={(t) => {
                setConfirm(t);
                setServerError(null);
              }}
              isPassword
              maxLength={PASSWORD_MAX}
              error={confirmError}
              testID="reset-confirm-password-input"
            />
            <Button
              title="Save New Password"
              onPress={handleSave}
              loading={saving}
              disabled={saving}
              style={styles.saveButton}
            />
            <PressableScale
              style={styles.cancel}
              onPress={() => {
                if (!saving) cancelPasswordRecovery();
              }}
              disabled={saving}
              activeOpacity={0.6}
            >
              <Text style={styles.cancelText}>Cancel and sign out</Text>
            </PressableScale>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: STITCH_COLORS.background,
  },
  flex: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingTop: 40,
  },
  brand: {
    fontSize: 22,
    fontFamily: FONTS.sans.semibold,
    color: '#FFFFFF',
    letterSpacing: -0.6,
    marginBottom: 24,
  },
  brandAccent: {
    color: STITCH_COLORS.onSurfaceVariant,
  },
  title: {
    fontSize: 24,
    fontFamily: FONTS.sans.semibold,
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  subtitle: {
    marginTop: 6,
    marginBottom: 18,
    fontSize: 13.5,
    lineHeight: 20,
    fontFamily: FONTS.sans.regular,
    color: '#A1A1A1',
  },
  card: {
    backgroundColor: '#0A0A0A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#262626',
    padding: 16,
  },
  serverError: {
    marginBottom: 6,
    fontSize: 12.5,
    fontFamily: FONTS.sans.medium,
    color: STITCH_COLORS.error,
  },
  saveButton: {
    marginTop: 12,
  },
  cancel: {
    alignSelf: 'center',
    marginTop: 14,
    paddingVertical: 6,
  },
  cancelText: {
    fontSize: 13,
    fontFamily: FONTS.sans.medium,
    color: '#A1A1A1',
  },
});
