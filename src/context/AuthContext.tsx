import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Session, User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import {
  signInWithEmail as apiSignInWithEmail,
  signUpWithEmail as apiSignUpWithEmail,
  signInWithGoogle as apiSignInWithGoogle,
  signOut as apiSignOut,
  createSessionFromUrl,
  getInitialSession,
  sendPasswordResetEmail,
  verifyCurrentPassword,
  updatePassword,
} from '../services/auth';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  authActionLoading: boolean;
  error: string | null;
  clearError: () => void;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (
    email: string,
    password: string
  ) => Promise<{ needsEmailVerification: boolean }>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  updateUserName: (name: string) => Promise<void>;
  updateUserProfile: (profile: { name: string; university: string | null }) => Promise<void>;
  completeTutorial: () => Promise<void>;
  /** True after opening a password-recovery link, until a new password is set. */
  passwordRecovery: boolean;
  /** Sends the recovery email (always resolves the same way for privacy). */
  requestPasswordReset: (email: string) => Promise<void>;
  /**
   * Changes the password. Pass the current password to re-authenticate
   * first (email accounts); null only during recovery.
   */
  changePassword: (currentPassword: string | null, newPassword: string) => Promise<void>;
  /** Leaves recovery mode without changing the password (signs out). */
  cancelPasswordRecovery: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [authActionLoading, setAuthActionLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordRecovery, setPasswordRecovery] = useState<boolean>(false);

  const clearError = useCallback(() => setError(null), []);

  // Handle incoming deep link redirect (e.g. forgeai://login-callback or exp://...)
  const handleDeepLink = useCallback(async (url: string | null) => {
    if (!url) return;
    const isAuthCallback =
      url.includes('login-callback') ||
      url.includes('access_token') ||
      url.includes('code=') ||
      url.includes('error=');

    if (!isAuthCallback) return;

    try {
      setAuthActionLoading(true);
      WebBrowser.dismissAuthSession();
      const newSession = await createSessionFromUrl(url);
      if (newSession) {
        setSession(newSession);
        setUser(newSession.user);
        if (/[?#&]type=recovery\b/.test(url)) setPasswordRecovery(true);
      }
    } catch (err: any) {
      console.warn('[AuthContext] Deep link session handling error:', err?.message || err);
      setError(err?.message || 'Failed to authenticate via deep link.');
    } finally {
      setAuthActionLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    // 1. Restore stored persistent session on app start
    getInitialSession()
      .then((initialSession) => {
        if (!isMounted) return;
        setSession(initialSession);
        setUser(initialSession?.user ?? null);
      })
      .catch((err) => {
        console.warn('[AuthContext] Session restore error:', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    // 2. Listen to Supabase auth state transitions
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        if (!isMounted) return;
        if (event === 'PASSWORD_RECOVERY') setPasswordRecovery(true);
        if (event === 'SIGNED_OUT') setPasswordRecovery(false);
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        setLoading(false);
      }
    );

    // 3. Listen to deep link events for OAuth redirect
    const linkingSubscription = Linking.addEventListener('url', (event) => {
      handleDeepLink(event.url);
    });

    // 4. Check if app was opened with a cold-start deep link
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink(url);
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
      linkingSubscription.remove();
    };
  }, [handleDeepLink]);

  const checkConfig = (): boolean => {
    if (!isSupabaseConfigured) {
      setError(
        'Supabase configuration missing in app runtime. Ensure EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY are in .env, then restart Metro: npx expo start -c'
      );
      return false;
    }
    return true;
  };

  const signInWithEmail = async (email: string, password: string) => {
    if (!checkConfig()) return;
    try {
      setAuthActionLoading(true);
      setError(null);
      const data = await apiSignInWithEmail(email, password);
      setSession(data.session);
      setUser(data.user);
    } catch (err: any) {
      const message = err?.message || 'Login failed. Please check your credentials.';
      setError(message);
      throw err;
    } finally {
      setAuthActionLoading(false);
    }
  };

  const signUpWithEmail = async (email: string, password: string) => {
    if (!checkConfig()) return { needsEmailVerification: false };
    try {
      setAuthActionLoading(true);
      setError(null);
      const res = await apiSignUpWithEmail(email, password);
      if (res.session) {
        setSession(res.session);
        setUser(res.user);
      }
      return { needsEmailVerification: res.needsEmailVerification };
    } catch (err: any) {
      const message = err?.message || 'Registration failed. Please try again.';
      setError(message);
      throw err;
    } finally {
      setAuthActionLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    if (!checkConfig()) return;
    try {
      setAuthActionLoading(true);
      setError(null);
      const newSession = await apiSignInWithGoogle();
      if (newSession) {
        setSession(newSession);
        setUser(newSession.user);
      }
    } catch (err: any) {
      const message =
        err?.message || 'Google sign-in was canceled or encountered an error.';
      setError(message);
      throw err;
    } finally {
      setAuthActionLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setAuthActionLoading(true);
      setError(null);
      await apiSignOut();
      setSession(null);
      setUser(null);
    } catch (err: any) {
      const message = err?.message || 'Logout failed.';
      setError(message);
      throw err;
    } finally {
      setAuthActionLoading(false);
    }
  };

  const updateUserName = async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) {
      throw new Error('Name cannot be empty.');
    }
    await saveUserMetadata({ full_name: trimmed, name: trimmed }, 'Failed to update name.');
  };

  // Saves name + university in a single auth.updateUser call.
  const updateUserProfile = async ({
    name,
    university,
  }: {
    name: string;
    university: string | null;
  }) => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      throw new Error('Name cannot be empty.');
    }
    const trimmedUniversity = university?.trim() || null;
    await saveUserMetadata(
      { full_name: trimmedName, name: trimmedName, university: trimmedUniversity },
      'Failed to update profile.'
    );
  };

  // Marks the first-run tutorial as seen so it never shows again on any device.
  const requestPasswordReset = async (email: string) => {
    if (!checkConfig()) return;
    const trimmed = email.trim();
    if (!trimmed) throw new Error('Enter your email address first.');
    try {
      await sendPasswordResetEmail(trimmed);
    } catch (err: any) {
      // Rate limits are worth surfacing; anything else stays generic so the
      // response never reveals whether an account exists.
      if (/rate limit|too many|seconds/i.test(err?.message || '')) {
        throw new Error('Too many requests. Please wait a minute and try again.');
      }
      console.warn('[AuthContext] Password reset request failed:', err?.message || err);
    }
  };

  const changePassword = async (currentPassword: string | null, newPassword: string) => {
    try {
      setAuthActionLoading(true);
      if (currentPassword !== null) {
        const email = user?.email;
        if (!email) throw new Error('Your account has no email address.');
        await verifyCurrentPassword(email, currentPassword);
      } else if (!passwordRecovery) {
        throw new Error('Please confirm your current password.');
      }
      await updatePassword(newPassword);
      setPasswordRecovery(false);
    } catch (err: any) {
      throw new Error(err?.message || 'Failed to change password.');
    } finally {
      setAuthActionLoading(false);
    }
  };

  const cancelPasswordRecovery = async () => {
    setPasswordRecovery(false);
    await signOut().catch(() => {});
  };

  const completeTutorial = async () => {
    await saveUserMetadata({ tutorial_completed: true }, 'Failed to save tutorial progress.');
  };

  const saveUserMetadata = async (
    metadata: Record<string, string | boolean | null>,
    fallbackMessage: string
  ) => {
    try {
      setAuthActionLoading(true);
      setError(null);
      const { data, error: updateErr } = await supabase.auth.updateUser({
        data: metadata,
      });
      if (updateErr) {
        throw updateErr;
      }
      if (data?.user) {
        setUser(data.user);
      }
    } catch (err: any) {
      const message = err?.message || fallbackMessage;
      setError(message);
      throw err;
    } finally {
      setAuthActionLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        authActionLoading,
        error,
        clearError,
        signInWithEmail,
        signUpWithEmail,
        signInWithGoogle,
        signOut,
        updateUserName,
        updateUserProfile,
        completeTutorial,
        passwordRecovery,
        requestPasswordReset,
        changePassword,
        cancelPasswordRecovery,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

