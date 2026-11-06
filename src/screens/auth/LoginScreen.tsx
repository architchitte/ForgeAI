import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  TextInput,
  Alert,
  Linking,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/common/Button';
import { STITCH_COLORS } from '../../constants/theme';
import { FONTS } from '../../constants/typography';
import { FocusBorderView } from '../../components/animation/FocusBorderView';
import { PRIVACY_POLICY_URL } from '../../constants/privacy';
import {
  MailIcon,
  LockIcon,
  EyeIcon,
  EyeOffIcon,
  ArrowRightIcon,
} from '../../components/common/AppIcons';

interface LoginScreenProps {
  onNavigateToSignUp: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onNavigateToSignUp }) => {
  const { signInWithEmail, signInWithGoogle, authActionLoading, error, clearError } =
    useAuth();

  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(true);
  const [localError, setLocalError] = useState<string | null>(null);
  // Index of the currently focused field (for border focus feedback).
  const [focusedField, setFocusedField] = useState<number | null>(null);

  const handleLogin = async () => {
    clearError();
    setLocalError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setLocalError('Please enter your email address.');
      return;
    }
    if (!password) {
      setLocalError('Please enter your password.');
      return;
    }

    try {
      await signInWithEmail(trimmedEmail, password);
    } catch {
      // Handled in AuthContext
    }
  };

  const handleGoogleLogin = async () => {
    clearError();
    setLocalError(null);
    try {
      await signInWithGoogle();
    } catch {
      // Handled in AuthContext
    }
  };

  const handleForgotPassword = () => {
    Alert.alert(
      'Reset Password',
      'If you have an active university account, password reset instructions will be sent to your registered academic email.',
      [{ text: 'OK' }]
    );
  };

  const handlePrivacy = async () => {
    try {
      const canOpen = await Linking.canOpenURL(PRIVACY_POLICY_URL);
      if (canOpen) {
        await Linking.openURL(PRIVACY_POLICY_URL);
      } else {
        Alert.alert(
          'Privacy Policy',
          `Please visit our Privacy Policy at:\n${PRIVACY_POLICY_URL}`
        );
      }
    } catch {
      Alert.alert(
        'Privacy Policy',
        `Please visit our Privacy Policy at:\n${PRIVACY_POLICY_URL}`
      );
    }
  };

  const displayedError = localError || error;

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.plaintextLogoWrapper}>
              <Text style={styles.plaintextLogo}>
                Forge<Text style={styles.plaintextLogoAccent}>AI</Text>
              </Text>
            </View>

            <Text style={styles.heroTitle}>Welcome back</Text>
            <Text style={styles.heroSubtitle}>
              Sign in to your ForgeAI account
            </Text>
          </View>

          {/* Form Card */}
          <View style={styles.card}>
            {displayedError ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>{displayedError}</Text>
              </View>
            ) : null}

            {/* Email Field */}
            <View style={styles.fieldGroup}>
              <View style={styles.fieldLabelRow}>
                <Text style={styles.fieldLabel}>Email</Text>
                <Text style={styles.fieldLabelHint}>Student / Academic</Text>
              </View>
              <FocusBorderView focused={focusedField === 0} style={styles.inputContainer}>
                <View style={styles.inputIconWrapper}>
                  <MailIcon size={18} color={STITCH_COLORS.outline} />
                </View>
                <TextInput
                  onFocus={() => setFocusedField(0)}
                  onBlur={() => setFocusedField((f) => (f === 0 ? null : f))}
                  style={styles.textInput}
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    if (displayedError) clearError();
                  }}
                  placeholder="student@university.edu"
                  placeholderTextColor={STITCH_COLORS.outline}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  testID="login-email-input"
                />
              </FocusBorderView>
            </View>

            {/* Password Field */}
            <View style={styles.fieldGroup}>
              <View style={styles.fieldLabelRow}>
                <Text style={styles.fieldLabel}>Password</Text>
                <TouchableOpacity onPress={handleForgotPassword} activeOpacity={0.7}>
                  <Text style={styles.forgotPasswordText}>Forgot password?</Text>
                </TouchableOpacity>
              </View>
              <FocusBorderView focused={focusedField === 1} style={styles.inputContainer}>
                <View style={styles.inputIconWrapper}>
                  <LockIcon size={18} color={STITCH_COLORS.outline} />
                </View>
                <TextInput
                  onFocus={() => setFocusedField(1)}
                  onBlur={() => setFocusedField((f) => (f === 1 ? null : f))}
                  style={styles.textInput}
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (displayedError) clearError();
                  }}
                  placeholder="••••••••••••"
                  placeholderTextColor={STITCH_COLORS.outline}
                  secureTextEntry={!showPassword}
                  testID="login-password-input"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeToggleBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  activeOpacity={0.7}
                >
                  {showPassword ? (
                    <EyeIcon size={18} color={STITCH_COLORS.outline} />
                  ) : (
                    <EyeOffIcon size={18} color={STITCH_COLORS.outline} />
                  )}
                </TouchableOpacity>
              </FocusBorderView>
            </View>

            {/* Utility Row: Remember Me & SSL Secured */}
            <View style={styles.utilityRow}>
              <TouchableOpacity
                style={styles.rememberMeRow}
                onPress={() => setRememberMe(!rememberMe)}
                activeOpacity={0.8}
              >
                <View style={[styles.checkbox, rememberMe && styles.checkboxActive]}>
                  {rememberMe && <Text style={styles.checkmarkIcon}>✓</Text>}
                </View>
                <Text style={styles.rememberMeText}>Remember for 30 days</Text>
              </TouchableOpacity>
            </View>

            {/* Sign In Button */}
            <Button
              title="Sign In"
              onPress={handleLogin}
              loading={authActionLoading}
              rightIcon={<ArrowRightIcon size={16} color="#000000" />}
              style={styles.submitBtn}
              testID="login-submit-button"
            />

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or continue with</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Google Workspace Button */}
            <Button
              title="Continue with Google"
              variant="google"
              onPress={handleGoogleLogin}
              loading={authActionLoading}
              testID="google-login-button"
            />
          </View>

          {/* Footer */}
          <View style={styles.footerContainer}>
            <View style={styles.footerRow}>
              <Text style={styles.footerText}>Don't have an account? </Text>
              <TouchableOpacity onPress={onNavigateToSignUp} activeOpacity={0.7}>
                <Text style={styles.footerLink}>Sign Up</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.legalLinksRow}>
              <TouchableOpacity onPress={handlePrivacy} activeOpacity={0.7}>
                <Text style={styles.legalLinkText}>Privacy Policy</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: STITCH_COLORS.background, // #faf8ff
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 24,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 8,
  },
  plaintextLogoWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    marginTop: 6,
  },
  plaintextLogo: {
    fontSize: 32,
    fontFamily: FONTS.sans.semibold,
    color: STITCH_COLORS.onSurface, // #131b2e
    letterSpacing: -0.6,
  },
  plaintextLogoAccent: {
    color: STITCH_COLORS.primaryContainer, // #4f46e5
  },
  workspacePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: STITCH_COLORS.surfaceContainer, // #eaedff
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 9999,
    marginBottom: 8,
    gap: 6,
  },
  workspaceDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: STITCH_COLORS.primaryContainer, // #4f46e5
  },
  workspacePillText: {
    fontSize: 11,
    fontFamily: FONTS.sans.semibold,
    color: STITCH_COLORS.onSurfaceVariant,
  },
  heroTitle: {
    fontSize: 26,
    fontFamily: FONTS.sans.semibold,
    color: STITCH_COLORS.onSurface, // #131b2e
    letterSpacing: -0.4,
  },
  heroSubtitle: {
    fontSize: 14,
    fontFamily: FONTS.sans.regular,
    color: STITCH_COLORS.onSurfaceVariant, // #464555
    marginTop: 3,
    textAlign: 'center',
  },
  card: {
    width: '100%',
    backgroundColor: '#0A0A0A',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#262626',
    marginTop: 18,
    gap: 14,
  },
  errorBanner: {
    backgroundColor: '#1F1F1F',
    borderRadius: 6,
    padding: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#737373',
  },
  errorBannerText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: FONTS.sans.medium,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fieldLabel: {
    fontSize: 13,
    fontFamily: FONTS.sans.medium,
    color: '#EDEDED',
  },
  fieldLabelHint: {
    fontSize: 11,
    fontFamily: FONTS.sans.regular,
    color: '#737373',
  },
  forgotPasswordText: {
    fontSize: 12,
    fontFamily: FONTS.sans.medium,
    color: '#A1A1A1',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000000',
    borderWidth: 1,
    borderColor: '#262626',
    borderRadius: 6,
    paddingHorizontal: 12,
    height: 44,
  },
  inputIconWrapper: {
    marginRight: 10,
    width: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: FONTS.sans.regular,
    color: '#EDEDED',
  },
  eyeToggleBtn: {
    padding: 6,
  },
  eyeToggleIcon: {
    fontSize: 14,
    fontFamily: FONTS.sans.regular,
  },
  utilityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  rememberMeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkbox: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#454545',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
  },
  checkboxActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  checkmarkIcon: {
    fontSize: 10,
    fontFamily: FONTS.sans.semibold,
    color: '#000000',
  },
  rememberMeText: {
    fontSize: 12,
    fontFamily: FONTS.sans.regular,
    color: '#A1A1A1',
  },
  sslBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  sslDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#FFFFFF',
  },
  sslText: {
    fontSize: 11,
    fontFamily: FONTS.sans.medium,
    color: '#EDEDED',
  },
  submitBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    minHeight: 44,
    marginTop: 4,
  },
  buttonArrow: {
    color: '#000000',
    fontSize: 14,
    fontFamily: FONTS.sans.regular,
    marginLeft: 4,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#262626',
  },
  dividerText: {
    marginHorizontal: 10,
    fontSize: 11,
    color: '#737373',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontFamily: FONTS.sans.medium,
  },
  ssoInfoCard: {
    backgroundColor: '#111111',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#262626',
    padding: 12,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
    marginTop: 2,
  },
  ssoShieldIcon: {
    fontSize: 14,
    fontFamily: FONTS.sans.regular,
    marginTop: 1,
  },
  ssoInfoText: {
    flex: 1,
    fontSize: 11.5,
    fontFamily: FONTS.sans.regular,
    color: STITCH_COLORS.onSurfaceVariant,
    lineHeight: 16,
  },
  footerContainer: {
    alignItems: 'center',
    marginTop: 22,
    gap: 8,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 13,
    fontFamily: FONTS.sans.regular,
    color: STITCH_COLORS.onSurfaceVariant,
  },
  footerLink: {
    fontSize: 13,
    color: STITCH_COLORS.primaryContainer,
    fontFamily: FONTS.sans.semibold,
  },
  legalLinksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  legalLinkText: {
    fontSize: 11,
    fontFamily: FONTS.sans.regular,
    color: STITCH_COLORS.outline,
  },
  legalDot: {
    fontSize: 11,
    fontFamily: FONTS.sans.regular,
    color: STITCH_COLORS.outline,
  },
});
