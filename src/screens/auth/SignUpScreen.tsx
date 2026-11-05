import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Image,
  Animated,
  Easing,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { STITCH_COLORS, STITCH_ASSETS } from '../../constants/theme';

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
  const [agreedToTerms, setAgreedToTerms] = useState<boolean>(true);
  const [localError, setLocalError] = useState<string | null>(null);
  const [verificationSent, setVerificationSent] = useState<boolean>(false);

  // Animations matching Stitch animate-ping micro-interactions
  const pingAnim = useRef(new Animated.Value(0)).current;
  const beaconPing = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 2s ping loop for singularity core
    Animated.loop(
      Animated.timing(pingAnim, {
        toValue: 1,
        duration: 2200,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      })
    ).start();

    // 1.5s ping loop for beacon dot
    Animated.loop(
      Animated.timing(beaconPing, {
        toValue: 1,
        duration: 1500,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      })
    ).start();
  }, [pingAnim, beaconPing]);

  const pingScale = pingAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.4],
  });

  const pingOpacity = pingAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.5, 0],
  });

  const beaconScale = beaconPing.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 2.2],
  });

  const beaconOpacity = beaconPing.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 0],
  });

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
        >
          {/* Dynamic Accretion Ambient Glow */}
          <View style={styles.ambientAura} pointerEvents="none" />

          {/* Header & Singularity Emblem */}
          <View style={styles.header}>
            <View style={styles.emblemContainer}>
              {/* Animated Ping Ring: animate-ping */}
              <Animated.View
                style={[
                  styles.pingOrbitRing,
                  {
                    transform: [{ scale: pingScale }],
                    opacity: pingOpacity,
                  },
                ]}
              />

              <View style={styles.secondaryRing} />

              <View style={styles.coreBlackHole}>
                <Image
                  source={STITCH_ASSETS.singularityLogo}
                  style={styles.singularityLogo}
                  resizeMode="contain"
                />
              </View>
            </View>

            <View style={styles.badgePill}>
              <View style={styles.beaconDotWrap}>
                <Animated.View
                  style={[
                    styles.beaconPulseRing,
                    {
                      transform: [{ scale: beaconScale }],
                      opacity: beaconOpacity,
                    },
                  ]}
                />
                <View style={styles.beaconDot} />
              </View>
              <Text style={styles.badgePillText}>CREATE ACCOUNT</Text>
            </View>

            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>
              Join ForgeAI to share and discover student AI projects.
            </Text>
          </View>

          {/* Registration Form Surface */}
          <View style={styles.card}>
            <View style={styles.photonLine} />

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

            <Input
              label="Full Name"
              value={fullName}
              onChangeText={(text) => setFullName(text)}
              placeholder="Alex Chen"
              autoCapitalize="words"
              testID="signup-name-input"
            />

            <Input
              label="Student Email"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (displayedError) clearError();
              }}
              placeholder="student@university.edu"
              keyboardType="email-address"
              autoCapitalize="none"
              testID="signup-email-input"
            />

            <Input
              label="Password"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (displayedError) clearError();
              }}
              placeholder="••••••••••••"
              isPassword
              testID="signup-password-input"
            />

            {/* Password Requirements Checklist */}
            <View style={styles.requirementsBox}>
              <Text style={styles.requirementsHeader}>Password requirements</Text>

              <View style={styles.requirementRow}>
                <View
                  style={[
                    styles.checkBadge,
                    hasMinChars && styles.checkBadgeActive,
                  ]}
                >
                  <Text style={styles.checkText}>✓</Text>
                </View>
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
                <View
                  style={[
                    styles.checkBadge,
                    hasNumber && styles.checkBadgeActive,
                  ]}
                >
                  <Text style={styles.checkText}>✓</Text>
                </View>
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
                <View
                  style={[
                    styles.checkBadge,
                    hasSpecialChar && styles.checkBadgeActive,
                  ]}
                >
                  <Text style={styles.checkText}>✓</Text>
                </View>
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

            <Input
              label="Confirm Password"
              value={confirmPassword}
              onChangeText={(text) => {
                setConfirmPassword(text);
                if (displayedError) clearError();
              }}
              placeholder="••••••••••••"
              isPassword
              testID="signup-confirm-password-input"
            />

            {/* Academic Protocol Agreement */}
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
                <Text style={styles.termsHighlight}>Terms of Service</Text> and{' '}
                <Text style={styles.termsHighlight}>Privacy Policy</Text>.
              </Text>
            </TouchableOpacity>

            <Button
              title="Create Account"
              onPress={handleSignUp}
              loading={authActionLoading}
              rightIcon={<Text style={styles.buttonArrow}>→</Text>}
              style={styles.submitBtn}
              testID="signup-submit-button"
            />

            {/* Google Signup */}
            <Button
              title="Sign up with Google"
              variant="google"
              onPress={handleGoogleLogin}
              loading={authActionLoading}
              testID="google-signup-button"
            />
          </View>

          {/* Navigation to Login */}
          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Already have an account?</Text>
            <TouchableOpacity onPress={onNavigateToLogin} activeOpacity={0.7}>
              <Text style={styles.footerLink}> Sign In ↗</Text>
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
    backgroundColor: STITCH_COLORS.background,
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
    alignItems: 'center',
  },
  ambientAura: {
    position: 'absolute',
    top: -50,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: STITCH_COLORS.primaryContainer,
    opacity: 0.15,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  emblemContainer: {
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    position: 'relative',
  },
  pingOrbitRing: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 1.5,
    borderColor: STITCH_COLORS.primaryContainer,
  },
  secondaryRing: {
    position: 'absolute',
    width: 86,
    height: 86,
    borderRadius: 43,
    borderWidth: 1,
    borderColor: STITCH_COLORS.secondary + '40',
  },
  coreBlackHole: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: STITCH_COLORS.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: STITCH_COLORS.primaryContainer,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 18,
    elevation: 6,
  },
  singularityLogo: {
    width: 58,
    height: 58,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: STITCH_COLORS.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: STITCH_COLORS.outlineVariant + '40',
    marginBottom: 8,
  },
  beaconDotWrap: {
    width: 12,
    height: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
    position: 'relative',
  },
  beaconPulseRing: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: STITCH_COLORS.primaryContainer,
  },
  beaconDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: STITCH_COLORS.primaryContainer,
    shadowColor: STITCH_COLORS.primaryContainer,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  badgePillText: {
    fontSize: 10,
    fontWeight: '800',
    color: STITCH_COLORS.secondary,
    letterSpacing: 1.2,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: STITCH_COLORS.onSurface,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: STITCH_COLORS.onSurfaceVariant,
    textAlign: 'center',
    marginTop: 4,
  },
  card: {
    width: '100%',
    backgroundColor: STITCH_COLORS.surfaceContainerLow,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: STITCH_COLORS.surfaceContainerHighest + '60',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 6,
  },
  photonLine: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    height: 2,
    backgroundColor: STITCH_COLORS.primaryContainer,
    opacity: 0.8,
    borderRadius: 1,
  },
  verificationBanner: {
    backgroundColor: '#064E3B',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: STITCH_COLORS.success,
  },
  verificationTitle: {
    color: '#D1FAE5',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  verificationText: {
    color: '#A7F3D0',
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
  requirementsBox: {
    backgroundColor: STITCH_COLORS.surfaceContainerLow,
    borderWidth: 1,
    borderColor: STITCH_COLORS.outlineVariant + '40',
    borderRadius: 6,
    padding: 10,
    marginVertical: 4,
  },
  requirementsHeader: {
    fontSize: 11,
    fontWeight: '600',
    color: STITCH_COLORS.outline,
    marginBottom: 6,
  },
  requirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 2,
  },
  checkBadge: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: STITCH_COLORS.surfaceContainerHighest,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  checkBadgeActive: {
    backgroundColor: STITCH_COLORS.primaryContainer,
  },
  checkText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  requirementLabel: {
    fontSize: 11,
    color: STITCH_COLORS.outline,
  },
  requirementLabelActive: {
    color: STITCH_COLORS.onSurface,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: STITCH_COLORS.outlineVariant,
    backgroundColor: STITCH_COLORS.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
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
    lineHeight: 16,
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
    marginTop: 6,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 22,
  },
  footerText: {
    fontSize: 13,
    color: STITCH_COLORS.onSurfaceVariant,
  },
  footerLink: {
    fontSize: 13,
    color: STITCH_COLORS.secondary,
    fontWeight: '700',
  },
});
