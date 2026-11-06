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
import { PRIVACY_POLICY_URL } from '../../constants/privacy';
import {
  UserIcon,
  GraduationCapIcon,
  LockIcon,
  EyeIcon,
  EyeOffIcon,
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
  const [agreedToPrivacy, setAgreedToPrivacy] = useState<boolean>(true);
  const [localError, setLocalError] = useState<string | null>(null);
  const [verificationSent, setVerificationSent] = useState<boolean>(false);

  // Dynamic Password Validation Checks
  const hasMinChars = password.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  // Unmet requirements: only visible when the user has entered text and is missing conditions
  const unmetRequirements: string[] = [];
  if (password.length > 0) {
    if (!hasMinChars) unmetRequirements.push('At least 8 characters');
    if (!hasLetter) unmetRequirements.push('At least 1 letter (a-z, A-Z)');
    if (!hasNumber) unmetRequirements.push('At least 1 number');
    if (!hasSpecialChar) unmetRequirements.push('At least 1 special character / symbol');
  }

  const handleSignUp = async () => {
    clearError();
    setLocalError(null);
    setVerificationSent(false);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setLocalError('Please enter a valid student email address.');
      return;
    }
    if (!hasMinChars) {
      setLocalError('Password must be at least 8 characters.');
      return;
    }
    if (!hasLetter) {
      setLocalError('Password must contain at least 1 letter.');
      return;
    }
    if (!hasNumber) {
      setLocalError('Password must contain at least 1 number.');
      return;
    }
    if (!hasSpecialChar) {
      setLocalError('Password must contain at least 1 special character.');
      return;
    }
    if (password !== confirmPassword) {
      setLocalError('Passwords do not match.');
      return;
    }
    if (!agreedToPrivacy) {
      setLocalError('Please accept the Privacy Policy to continue.');
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

              {/* Dynamic Password Requirements Box (only shown when user entered text and conditions are missing) */}
              {unmetRequirements.length > 0 && (
                <View style={styles.requirementsBox}>
                  <Text style={styles.requirementsHeader}>Password requires:</Text>
                  {unmetRequirements.map((req, idx) => (
                    <View key={idx} style={styles.requirementRow}>
                      <View style={styles.requirementDot} />
                      <Text style={styles.requirementLabel}>{req}</Text>
                    </View>
                  ))}
                </View>
              )}
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

            {/* Privacy Policy Agreement Checkbox */}
            <TouchableOpacity
              style={styles.termsRow}
              onPress={() => setAgreedToPrivacy((prev) => !prev)}
              activeOpacity={0.8}
            >
              <View
                style={[
                  styles.checkbox,
                  agreedToPrivacy && styles.checkboxActive,
                ]}
              >
                {agreedToPrivacy && <Text style={styles.checkboxTick}>✓</Text>}
              </View>
              <Text style={styles.termsText}>
                I agree to the{' '}
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
              rightIcon={<ArrowRightIcon size={16} color="#000000" />}
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
    color: '#A1A1A1',
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: '#333333',
    marginBottom: 8,
    gap: 6,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  badgePillText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#EDEDED',
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 13,
    color: '#A1A1A1',
    textAlign: 'center',
    marginTop: 4,
  },
  card: {
    width: '100%',
    backgroundColor: '#0A0A0A',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#262626',
  },
  verificationBanner: {
    backgroundColor: '#111111',
    borderRadius: 6,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#FFFFFF',
  },
  verificationTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  verificationText: {
    color: '#EDEDED',
    fontSize: 12,
  },
  errorBanner: {
    backgroundColor: '#1F1F1F',
    borderRadius: 6,
    padding: 10,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#737373',
  },
  errorBannerText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  fieldGroup: {
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#EDEDED',
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000000',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#262626',
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
    fontSize: 13.5,
    color: '#EDEDED',
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
    backgroundColor: '#111111',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#262626',
    padding: 10,
    marginTop: 8,
    gap: 6,
  },
  requirementsHeader: {
    fontSize: 11,
    fontWeight: '600',
    color: '#A1A1A1',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  requirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  requirementDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#A1A1A1',
  },
  requirementLabel: {
    fontSize: 12,
    color: '#EDEDED',
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 10,
  },
  checkbox: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#454545',
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginTop: 2,
  },
  checkboxActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  checkboxTick: {
    fontSize: 10,
    fontWeight: '800',
    color: '#000000',
  },
  termsText: {
    flex: 1,
    fontSize: 12,
    color: '#A1A1A1',
    lineHeight: 18,
  },
  termsHighlight: {
    color: '#EDEDED',
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  buttonArrow: {
    fontSize: 16,
    color: '#000000',
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
    backgroundColor: '#262626',
  },
  dividerBadge: {
    position: 'absolute',
    backgroundColor: '#0A0A0A',
    paddingHorizontal: 8,
  },
  dividerText: {
    fontSize: 11,
    color: '#737373',
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
    color: '#A1A1A1',
  },
  footerLink: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
