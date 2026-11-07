import React, { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { STITCH_COLORS } from '../../constants/theme';
import { FONTS } from '../../constants/typography';
import { ArrowRightIcon, LockIcon, MailIcon } from '../common/AppIcons';
import { PressableScale } from '../animation/PressableScale';
import { ChangePasswordModal } from './ChangePasswordModal';

/** True when the account can sign in with an email + password. */
const hasPasswordLogin = (user: ReturnType<typeof useAuth>['user']): boolean => {
  if (!user) return false;
  const providers = (user.app_metadata?.providers as string[] | undefined) ?? [];
  return (
    providers.includes('email') ||
    (user.identities ?? []).some((i) => i.provider === 'email')
  );
};

/** Profile → Account Security: change password, reset by email. */
export const AccountSecuritySection: React.FC = () => {
  const { user, requestPasswordReset } = useAuth();
  const [changeOpen, setChangeOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const canChange = hasPasswordLogin(user);

  const sendReset = () => {
    const email = user?.email;
    if (!email) {
      Alert.alert('No email address', 'Your account does not have an email address.');
      return;
    }
    Alert.alert(
      canChange ? 'Reset password by email?' : 'Set a password by email?',
      `We'll send a secure link to ${email}. Open it on this device to choose a new password.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Link',
          onPress: async () => {
            setSending(true);
            try {
              await requestPasswordReset(email);
              Alert.alert('Check your inbox', `If ${email} can receive email, a reset link is on its way.`);
            } catch (err: any) {
              Alert.alert('Could not send link', err?.message || 'Please try again later.');
            } finally {
              setSending(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.section}>
      <Text style={styles.heading}>Account Security</Text>
      <View style={styles.card}>
        {canChange ? (
          <PressableScale
            style={styles.row}
            onPress={() => setChangeOpen(true)}
            activeOpacity={0.7}
            pressedScale={0.99}
            accessibilityLabel="Change password"
          >
            <LockIcon size={16} color="#EDEDED" />
            <View style={styles.flex}>
              <Text style={styles.rowTitle}>Change password</Text>
              <Text style={styles.rowSub}>Requires your current password</Text>
            </View>
            <ArrowRightIcon size={14} color={STITCH_COLORS.outline} />
          </PressableScale>
        ) : (
          <View style={styles.row}>
            <LockIcon size={16} color="#737373" />
            <View style={styles.flex}>
              <Text style={styles.rowTitle}>Password</Text>
              <Text style={styles.rowSub}>
                You sign in with Google. Use the email link below if you also want a password.
              </Text>
            </View>
          </View>
        )}
        <View style={styles.divider} />
        <PressableScale
          style={styles.row}
          onPress={sendReset}
          disabled={sending}
          activeOpacity={0.7}
          pressedScale={0.99}
          accessibilityLabel={canChange ? 'Forgot password' : 'Set a password by email'}
        >
          <MailIcon size={16} color="#EDEDED" />
          <View style={styles.flex}>
            <Text style={styles.rowTitle}>
              {canChange ? 'Forgot your password?' : 'Set a password by email'}
            </Text>
            <Text style={styles.rowSub}>Get a secure reset link by email</Text>
          </View>
          {sending ? (
            <ActivityIndicator size="small" color={STITCH_COLORS.outline} />
          ) : (
            <ArrowRightIcon size={14} color={STITCH_COLORS.outline} />
          )}
        </PressableScale>
      </View>
      <ChangePasswordModal visible={changeOpen} onClose={() => setChangeOpen(false)} />
    </View>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    minWidth: 0,
  },
  section: {
    marginBottom: 24,
  },
  heading: {
    marginBottom: 12,
    fontSize: 16,
    fontFamily: FONTS.sans.semibold,
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#262626',
    backgroundColor: '#0A0A0A',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  rowTitle: {
    fontSize: 13.5,
    fontFamily: FONTS.sans.semibold,
    color: '#EDEDED',
  },
  rowSub: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: FONTS.sans.regular,
    color: '#737373',
  },
  divider: {
    height: 1,
    marginHorizontal: 14,
    backgroundColor: '#171717',
  },
});
