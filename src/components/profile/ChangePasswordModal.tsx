import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { FONTS } from '../../constants/typography';
import { PASSWORD_MAX, validateNewPassword } from '../../constants/password';
import { Input } from '../common/Input';
import { FormSheet } from './FormSheet';
import { PasswordStrengthMeter } from './PasswordStrengthMeter';

interface ChangePasswordModalProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * Change password for email/password accounts. The current password is
 * verified by re-authenticating with Supabase Auth before the update —
 * nothing is stored or logged by the app.
 */
export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ visible, onClose }) => {
  const { changePassword } = useAuth();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setCurrent('');
    setNext('');
    setConfirm('');
    setSubmitted(false);
    setServerError(null);
  }, [visible]);

  const currentError = submitted && !current ? 'Enter your current password.' : null;
  const nextError = submitted || next.length > 0 ? validateNewPassword(next, next, current) : null;
  const confirmError =
    (submitted || confirm.length > 0) && confirm !== next ? 'Passwords do not match.' : null;

  const handleSave = async () => {
    setSubmitted(true);
    setServerError(null);
    if (!current || validateNewPassword(next, confirm, current)) return;
    setSaving(true);
    try {
      await changePassword(current, next);
      setSaving(false);
      onClose();
      Alert.alert('Password changed', 'Use your new password the next time you sign in.');
    } catch (err: any) {
      setSaving(false);
      setServerError(err?.message || 'Failed to change password.');
    }
  };

  return (
    <FormSheet
      visible={visible}
      title="Change Password"
      subtitle="Confirm your current password, then choose a new one."
      onClose={onClose}
      submitLabel="Update Password"
      onSubmit={handleSave}
      submitting={saving}
    >
      {serverError && (
        <View style={styles.errorBox}>
          <Text style={styles.errorBoxText}>{serverError}</Text>
        </View>
      )}
      <Input
        label="Current password"
        value={current}
        onChangeText={(t) => {
          setCurrent(t);
          setServerError(null);
        }}
        isPassword
        maxLength={PASSWORD_MAX}
        error={currentError}
        testID="current-password-input"
      />
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
        testID="new-password-input"
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
        testID="confirm-password-input"
      />
    </FormSheet>
  );
};

const styles = StyleSheet.create({
  errorBox: {
    marginBottom: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#454545',
    backgroundColor: '#111111',
  },
  errorBoxText: {
    fontSize: 12.5,
    fontFamily: FONTS.sans.medium,
    color: '#EDEDED',
  },
});
