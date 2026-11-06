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
              <View style={styles.inputContainer}>
                <View style={styles.inputIconWrapper}>
                  <MailIcon size={18} color={STITCH_COLORS.outline} />
                </View>
                <TextInput
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
              </View>
            </View>

            {/* Password Field */}
            <View style={styles.fieldGroup}>
              <View style={styles.fieldLabelRow}>
                <Text style={styles.fieldLabel}>Password</Text>
                <TouchableOpacity onPress={handleForgotPassword} activeOpacity={0.7}>
                  <Text style={styles.forgotPasswordText}>Forgot password?</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.inputContainer}>
                <View style={styles.inputIconWrapper}>
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
                  testID="login-password-input"
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
              rightIcon={<ArrowRightIcon size={16} color="#FFFFFF" />}
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
              <TouchableOpacity onPress={handleTerms} activeOpacity={0.7}>
                <Text style={styles.legalLinkText}>Terms of Service</Text>
              </TouchableOpacity>
              <Text style={styles.legalDot}>•</Text>
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
    fontWeight: '800',
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
    fontWeight: '600',
    color: STITCH_COLORS.onSurfaceVariant,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: STITCH_COLORS.onSurface, // #131b2e
    letterSpacing: -0.4,
  },
  heroSubtitle: {
    fontSize: 14,
    color: STITCH_COLORS.onSurfaceVariant, // #464555
    marginTop: 3,
    textAlign: 'center',
  },
  card: {
    width: '100%',
    backgroundColor: STITCH_COLORS.surfaceContainerLowest, // #ffffff
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: STITCH_COLORS.surfaceContainerHighest, // #dae2fd
    marginTop: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    gap: 14,
  },
  errorBanner: {
    backgroundColor: STITCH_COLORS.errorContainer, // #ffdad6
    borderRadius: 8,
    padding: 10,
    borderLeftWidth: 3,
    borderLeftColor: STITCH_COLORS.error,
  },
  errorBannerText: {
    color: STITCH_COLORS.onErrorContainer,
    fontSize: 12,
    fontWeight: '600',
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
    fontWeight: '600',
    color: STITCH_COLORS.onSurface,
  },
  fieldLabelHint: {
    fontSize: 11,
    color: STITCH_COLORS.onSurfaceVariant,
  },
  forgotPasswordText: {
    fontSize: 12,
    fontWeight: '600',
    color: STITCH_COLORS.primaryContainer,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: STITCH_COLORS.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 46,
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
    color: STITCH_COLORS.onSurface,
  },
  eyeToggleBtn: {
    padding: 6,
  },
  eyeToggleIcon: {
    fontSize: 14,
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
    borderColor: STITCH_COLORS.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  checkboxActive: {
    backgroundColor: STITCH_COLORS.primaryContainer,
    borderColor: STITCH_COLORS.primaryContainer,
  },
  checkmarkIcon: {
    fontSize: 10,
    fontWeight: '800',
    color: '#ffffff',
  },
  rememberMeText: {
    fontSize: 12,
    color: STITCH_COLORS.onSurfaceVariant,
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
    backgroundColor: '#10b981',
  },
  sslText: {
    fontSize: 11,
    fontWeight: '600',
    color: STITCH_COLORS.tertiary,
  },
  submitBtn: {
    backgroundColor: STITCH_COLORS.primaryContainer,
    borderRadius: 10,
    minHeight: 46,
    marginTop: 4,
  },
  buttonArrow: {
    color: '#ffffff',
    fontSize: 14,
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
    backgroundColor: STITCH_COLORS.surfaceContainerHigh,
  },
  dividerText: {
    marginHorizontal: 10,
    fontSize: 11,
    color: STITCH_COLORS.outline,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontWeight: '600',
  },
  ssoInfoCard: {
    backgroundColor: STITCH_COLORS.surfaceContainerLow,
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
    marginTop: 2,
  },
  ssoShieldIcon: {
    fontSize: 14,
    marginTop: 1,
  },
  ssoInfoText: {
    flex: 1,
    fontSize: 11.5,
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
    color: STITCH_COLORS.onSurfaceVariant,
  },
  footerLink: {
    fontSize: 13,
    color: STITCH_COLORS.primaryContainer,
    fontWeight: '600',
  },
  legalLinksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  legalLinkText: {
    fontSize: 11,
    color: STITCH_COLORS.outline,
  },
  legalDot: {
    fontSize: 11,
    color: STITCH_COLORS.outline,
  },
});
