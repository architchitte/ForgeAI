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
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/common/Button';
import { STITCH_COLORS } from '../../constants/theme';
import {
  UserIcon,
  GraduationCapIcon,
  LockIcon,
  EyeIcon,
  EyeOffIcon,
  CheckCircleIcon,
  ShieldCheckIcon,
  ArrowRightIcon,
} from '../../components/common/AppIcons';

interface SignUpScreenProps {
  onNavigateToLogin: () => void;
}

export const SignUpScreen: React.FC<SignUpScreenProps> = ({
  onNavigateToLogin,
}) => {
  const {
    signUpWithEmail,
    signInWithGoogle,
    authActionLoading,
    error,
    clearError,
  } = useAuth();

  const [fullName, setFullName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [agreedToTerms, setAgreedToTerms] = useState<boolean>(true);
  const [localError, setLocalError] = useState<string | null>(null);
  const [verificationSent, setVerificationSent] = useState<boolean>(false);

  // Dynamic Password Validation Checks
  const hasMinChars = password.length >= 8;
  const hasNumber = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  const handleSignUp = async () => {
    clearError();
    setLocalError(null);
    setVerificationSent(false);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setLocalError('Please enter a valid student email address.');
      return;
    }
    if (password.length < 6) {
      setLocalError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setLocalError('Passwords do not match.');
      return;
    }
    if (!agreedToTerms) {
      setLocalError('Please accept the Terms of Service to continue.');
      return;
    }

    try {
      const res = await signUpWithEmail(trimmedEmail, password);
      if (res.needsEmailVerification) {
        setVerificationSent(true);
      }
    } catch {
      // Handled in AuthContext
    }
  };

  const handleGoogleLogin = async () => {
    clearError();
    setLocalError(null);
    setVerificationSent(false);
    try {
      await signInWithGoogle();
    } catch {
      // Handled in AuthContext
    }
  };

  const handleTerms = () => {
    Alert.alert(
      'Terms of Service',
      'ForgeAI academic showcase and student agent publishing terms.'
    );
  };

  const handlePrivacy = () => {
    Alert.alert(
      'Privacy Policy',
      'ForgeAI data privacy and academic credential protection guidelines.'
    );
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

            <Text style={styles.heroTitle}>Create Account</Text>
            <Text style={styles.heroSubtitle}>
              Join ForgeAI to share and discover student AI projects.
            </Text>
          </View>

          {/* Registration Form Card */}
          <View style={styles.card}>
            {verificationSent ? (
              <View style={styles.verificationBanner}>
                <Text style={styles.verificationTitle}>Verification Email Sent</Text>
                <Text style={styles.verificationText}>
                  Please check your inbox at {email.trim()} to verify your account before signing in.
                </Text>
              </View>
            ) : null}

            {displayedError ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>{displayedError}</Text>
              </View>
            ) : null}

            {/* Full Name Field */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Full Name</Text>
              <View style={styles.inputContainer}>
                <View style={styles.inputIconWrap}>
                  <UserIcon size={18} color={STITCH_COLORS.outline} />
                </View>
                <TextInput
                  style={styles.textInput}
                  value={fullName}
                  onChangeText={(text) => setFullName(text)}
                  placeholder="Alex Chen"
                  placeholderTextColor={STITCH_COLORS.outline}
                  autoCapitalize="words"
                  autoCorrect={false}
                  testID="signup-name-input"
                />
              </View>
            </View>

            {/* Student Email Field */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Student Email</Text>
              <View style={styles.inputContainer}>
                <View style={styles.inputIconWrap}>
                  <GraduationCapIcon size={18} color={STITCH_COLORS.outline} />
                </View>
                <TextInput
                  style={styles.textInput}
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    if (displayedError) clearError();
                  }}
                  placeholder="alex.chen@university.edu"
                  placeholderTextColor={STITCH_COLORS.outline}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  testID="signup-email-input"
                />
              </View>
            </View>

            {/* Password Field */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Password</Text>
              <View style={styles.inputContainer}>
                <View style={styles.inputIconWrap}>
                  <LockIcon size={18} color={STITCH_COLORS.outline} />
                </View>
                <TextInput
                  style={styles.textInput}
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (displayedError) clearError();
                  }}
                  placeholder="••••••••••••"
                  placeholderTextColor={STITCH_COLORS.outline}
                  secureTextEntry={!showPassword}
                  testID="signup-password-input"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeToggleBtn}
                  activeOpacity={0.7}
                >
                  {showPassword ? (
                    <EyeIcon size={18} color={STITCH_COLORS.outline} />
                  ) : (
                    <EyeOffIcon size={18} color={STITCH_COLORS.outline} />
                  )}
                </TouchableOpacity>
              </View>

              {/* Password Checklist Box */}
              <View style={styles.requirementsBox}>
                <View style={styles.requirementRow}>
                  <CheckCircleIcon size={15} checked={hasMinChars} />
                  <Text
                    style={[
                      styles.requirementLabel,
                      hasMinChars && styles.requirementLabelActive,
                    ]}
                  >
                    At least 8 characters
                  </Text>
                </View>

                <View style={styles.requirementRow}>
                  <CheckCircleIcon size={15} checked={hasNumber} />
                  <Text
                    style={[
                      styles.requirementLabel,
                      hasNumber && styles.requirementLabelActive,
                    ]}
                  >
                    At least 1 number
                  </Text>
                </View>

                <View style={styles.requirementRow}>
                  <CheckCircleIcon size={15} checked={hasSpecialChar} />
                  <Text
                    style={[
                      styles.requirementLabel,
                      hasSpecialChar && styles.requirementLabelActive,
                    ]}
                  >
                    At least 1 special character
                  </Text>
                </View>
              </View>
            </View>

            {/* Confirm Password Field */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Confirm Password</Text>
              <View style={styles.inputContainer}>
                <View style={styles.inputIconWrap}>
                  <ShieldCheckIcon size={18} color={STITCH_COLORS.outline} />
                </View>
                <TextInput
                  style={styles.textInput}
                  value={confirmPassword}
                  onChangeText={(text) => {
                    setConfirmPassword(text);
                    if (displayedError) clearError();
                  }}
                  placeholder="••••••••••••"
                  placeholderTextColor={STITCH_COLORS.outline}
                  secureTextEntry={!showConfirmPassword}
                  testID="signup-confirm-password-input"
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={styles.eyeToggleBtn}
                  activeOpacity={0.7}
                >
                  {showConfirmPassword ? (
                    <EyeIcon size={18} color={STITCH_COLORS.outline} />
                  ) : (
                    <EyeOffIcon size={18} color={STITCH_COLORS.outline} />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Terms and Privacy Agreement Checkbox */}
            <TouchableOpacity
              style={styles.termsRow}
              onPress={() => setAgreedToTerms((prev) => !prev)}
              activeOpacity={0.8}
            >
              <View
                style={[
                  styles.checkbox,
                  agreedToTerms && styles.checkboxActive,
                ]}
              >
                {agreedToTerms && <Text style={styles.checkboxTick}>✓</Text>}
              </View>
              <Text style={styles.termsText}>
                I agree to the{' '}
                <Text style={styles.termsHighlight} onPress={handleTerms}>
                  Terms of Service
                </Text>{' '}
                and{' '}
                <Text style={styles.termsHighlight} onPress={handlePrivacy}>
                  Privacy Policy
                </Text>
                .
              </Text>
            </TouchableOpacity>

            {/* Submit Button */}
            <Button
              title="Create Account"
              onPress={handleSignUp}
              loading={authActionLoading}
              rightIcon={<ArrowRightIcon size={16} color="#FFFFFF" />}
              style={styles.submitBtn}
              testID="signup-submit-button"
            />

            {/* Divider */}
            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <View style={styles.dividerBadge}>
                <Text style={styles.dividerText}>or</Text>
              </View>
            </View>

            {/* Google SSO Button */}
            <Button
              title="Sign up with Google"
              variant="google"
              onPress={handleGoogleLogin}
              loading={authActionLoading}
              testID="google-signup-button"
            />
          </View>

          {/* Footer Link to Login */}
          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Already have an account?</Text>
            <TouchableOpacity onPress={onNavigateToLogin} activeOpacity={0.7}>
              <Text style={styles.footerLink}> Sign In</Text>
            </TouchableOpacity>
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
    marginBottom: 16,
  },
  plaintextLogoWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    marginTop: 4,
  },
  plaintextLogo: {
    fontSize: 32,
    fontWeight: '800',
    color: STITCH_COLORS.onSurface, // #131b2e
    letterSpacing: -0.6,
  },
  plaintextLogoAccent: {
    color: STITCH_COLORS.primaryContainer, // #4f46e5
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 3.5,
    borderRadius: 9999,
    backgroundColor: STITCH_COLORS.secondaryFixed, // #d8e2ff
    marginBottom: 8,
    gap: 6,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: STITCH_COLORS.secondary, // #0058be
  },
  badgePillText: {
    fontSize: 11,
    fontWeight: '600',
    color: STITCH_COLORS.onSecondaryFixed, // #001a42
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: STITCH_COLORS.onSurface,
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 13,
    color: STITCH_COLORS.onSurfaceVariant,
    textAlign: 'center',
    marginTop: 4,
  },
  card: {
    width: '100%',
    backgroundColor: STITCH_COLORS.surfaceContainerLowest, // #ffffff
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: STITCH_COLORS.surfaceContainerHighest, // #dae2fd
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  verificationBanner: {
    backgroundColor: '#ECFDF5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: STITCH_COLORS.success,
  },
  verificationTitle: {
    color: '#065F46',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  verificationText: {
    color: '#047857',
    fontSize: 12,
  },
  errorBanner: {
    backgroundColor: STITCH_COLORS.errorContainer,
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: STITCH_COLORS.error,
  },
  errorBannerText: {
    color: STITCH_COLORS.onSurface,
    fontSize: 12,
    fontWeight: '600',
  },
  fieldGroup: {
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: STITCH_COLORS.onSurface,
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: STITCH_COLORS.surfaceContainerLow, // #f2f3ff
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
    paddingHorizontal: 12,
    height: 44,
  },
  inputIconWrap: {
    width: 22,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textInput: {
    flex: 1,
    fontSize: 13,
    color: STITCH_COLORS.onSurface,
    paddingVertical: 0,
  },
  eyeToggleBtn: {
    padding: 4,
    marginLeft: 6,
  },
  eyeToggleIcon: {
    fontSize: 16,
  },
  requirementsBox: {
    backgroundColor: STITCH_COLORS.surfaceContainerLow, // #f2f3ff
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
    gap: 4,
  },
  requirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ruleIcon: {
    fontSize: 12,
    fontWeight: '700',
    color: STITCH_COLORS.outline,
    width: 14,
    textAlign: 'center',
  },
  ruleIconActive: {
    color: STITCH_COLORS.tertiary, // #005338
  },
  requirementLabel: {
    fontSize: 11,
    color: STITCH_COLORS.onSurfaceVariant,
  },
  requirementLabelActive: {
    color: STITCH_COLORS.tertiary,
    fontWeight: '600',
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 10,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: STITCH_COLORS.outlineVariant,
    backgroundColor: STITCH_COLORS.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginTop: 2,
  },
  checkboxActive: {
    backgroundColor: STITCH_COLORS.primaryContainer,
    borderColor: STITCH_COLORS.primaryContainer,
  },
  checkboxTick: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  termsText: {
    flex: 1,
    fontSize: 12,
    color: STITCH_COLORS.onSurfaceVariant,
    lineHeight: 18,
  },
  termsHighlight: {
    color: STITCH_COLORS.primary,
    fontWeight: '600',
  },
  buttonArrow: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  submitBtn: {
    marginTop: 4,
  },
  dividerContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
  },
  dividerLine: {
    width: '100%',
    height: 1,
    backgroundColor: STITCH_COLORS.surfaceContainerHighest,
  },
  dividerBadge: {
    position: 'absolute',
    backgroundColor: STITCH_COLORS.surfaceContainerLowest,
    paddingHorizontal: 8,
  },
  dividerText: {
    fontSize: 11,
    color: STITCH_COLORS.outline,
    textTransform: 'uppercase',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 18,
  },
  footerText: {
    fontSize: 13,
    color: STITCH_COLORS.onSurfaceVariant,
  },
  footerLink: {
    fontSize: 13,
    color: STITCH_COLORS.primary,
    fontWeight: '700',
  },
});
