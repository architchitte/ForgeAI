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

interface LoginScreenProps {
  onNavigateToSignUp: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onNavigateToSignUp }) => {
  const { signInWithEmail, signInWithGoogle, authActionLoading, error, clearError } =
    useAuth();

  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [localError, setLocalError] = useState<string | null>(null);

  // Animation values matching Stitch CSS
  const spinOuter = useRef(new Animated.Value(0)).current;
  const spinInner = useRef(new Animated.Value(0)).current;
  const pulseAura = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 18s clockwise linear spin for outer orbit ring
    Animated.loop(
      Animated.timing(spinOuter, {
        toValue: 1,
        duration: 18000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // 12s counter-clockwise linear spin for inner dashed ring
    Animated.loop(
      Animated.timing(spinInner, {
        toValue: 1,
        duration: 12000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Pulsing ambient aura
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAura, {
          toValue: 1,
          duration: 3000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAura, {
          toValue: 0,
          duration: 3000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [spinOuter, spinInner, pulseAura]);

  const outerRotate = spinOuter.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const innerRotate = spinInner.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '-360deg'],
  });

  const auraOpacity = pulseAura.interpolate({
    inputRange: [0, 1],
    outputRange: [0.12, 0.24],
  });

  const auraScale = pulseAura.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.08],
  });

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
          {/* Animated Radial Gravitational Ambient Aura */}
          <Animated.View
            style={[
              styles.ambientAura,
              {
                opacity: auraOpacity,
                transform: [{ scale: auraScale }],
              },
            ]}
            pointerEvents="none"
          />

          {/* Hero Singularity Emblem & Brand Header */}
          <View style={styles.header}>
            <View style={styles.emblemContainer}>
              {/* Outer Spin Ring: 18s linear */}
              <Animated.View
                style={[
                  styles.outerOrbitRing,
                  { transform: [{ rotate: outerRotate }] },
                ]}
              />

              {/* Inner Reverse Spin Ring: 12s dashed */}
              <Animated.View
                style={[
                  styles.innerOrbitRing,
                  { transform: [{ rotate: innerRotate }] },
                ]}
              />

              {/* Core Black Hole with Dropped Glow */}
              <View style={styles.coreBlackHole}>
                <Image
                  source={STITCH_ASSETS.singularityLogo}
                  style={styles.singularityLogo}
                  resizeMode="contain"
                />
              </View>
            </View>

            <View style={styles.brandTitleRow}>
              <Text style={styles.brandTitle}>
                Forge<Text style={styles.brandTitleAccent}>AI</Text>
              </Text>
            </View>

            <View style={styles.badgePill}>
              <Text style={styles.badgePillText}>SIGN IN</Text>
            </View>

            <Text style={styles.subtitle}>Sign in to your account.</Text>
          </View>

          {/* Terminal Login Interface Container */}
          <View style={styles.card}>
            {/* Photon Accent Line */}
            <View style={styles.photonLine} />

            {displayedError ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>{displayedError}</Text>
              </View>
            ) : null}

            <Input
              label="Email"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (displayedError) clearError();
              }}
              placeholder="student@university.edu"
              keyboardType="email-address"
              autoCapitalize="none"
              testID="login-email-input"
            />

            <Input
              label="Password"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (displayedError) clearError();
              }}
              placeholder="••••••••••••••••"
              isPassword
              testID="login-password-input"
            />

            <Button
              title="Sign In"
              onPress={handleLogin}
              loading={authActionLoading}
              icon={<Text style={styles.buttonBolt}>⚡</Text>}
              style={styles.submitBtn}
              testID="login-submit-button"
            />

            {/* Visual Quantum Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or continue with</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Google Workspace Federation Button */}
            <Button
              title="Continue with Google"
              variant="google"
              onPress={handleGoogleLogin}
              loading={authActionLoading}
              testID="google-login-button"
            />
          </View>

          {/* Telemetry Footnote & Registration Link */}
          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Don't have an account?</Text>
            <TouchableOpacity onPress={onNavigateToSignUp} activeOpacity={0.7}>
              <Text style={styles.footerLink}> Sign Up</Text>
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
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: STITCH_COLORS.primaryContainer,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  emblemContainer: {
    width: 112,
    height: 112,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    position: 'relative',
  },
  outerOrbitRing: {
    position: 'absolute',
    width: 112,
    height: 112,
    borderRadius: 56,
    borderWidth: 1.5,
    borderColor: STITCH_COLORS.primary + '35',
  },
  innerOrbitRing: {
    position: 'absolute',
    width: 98,
    height: 98,
    borderRadius: 49,
    borderWidth: 1.5,
    borderColor: STITCH_COLORS.primaryContainer + '60',
    borderStyle: 'dashed',
  },
  coreBlackHole: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: STITCH_COLORS.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: STITCH_COLORS.primaryContainer,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 8,
  },
  singularityLogo: {
    width: 64,
    height: 64,
  },
  brandTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  brandTitle: {
    fontSize: 34,
    fontWeight: '800',
    color: STITCH_COLORS.onSurface,
    letterSpacing: -0.5,
  },
  brandTitleAccent: {
    color: STITCH_COLORS.primaryContainer,
  },
  badgePill: {
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: STITCH_COLORS.surfaceContainerLow,
    marginBottom: 8,
  },
  badgePillText: {
    fontSize: 10,
    fontWeight: '800',
    color: STITCH_COLORS.primary,
    letterSpacing: 1.5,
  },
  subtitle: {
    fontSize: 14,
    color: STITCH_COLORS.outline,
    textAlign: 'center',
  },
  card: {
    width: '100%',
    backgroundColor: STITCH_COLORS.surfaceContainerLow,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: STITCH_COLORS.surfaceContainerHighest + '60',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
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
  buttonBolt: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  submitBtn: {
    marginTop: 10,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 14,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: STITCH_COLORS.surfaceContainerHighest,
  },
  dividerText: {
    marginHorizontal: 10,
    fontSize: 11,
    color: STITCH_COLORS.outline,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontWeight: '600',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  footerText: {
    fontSize: 13,
    color: STITCH_COLORS.outline,
  },
  footerLink: {
    fontSize: 13,
    color: STITCH_COLORS.primary,
    fontWeight: '700',
  },
});
