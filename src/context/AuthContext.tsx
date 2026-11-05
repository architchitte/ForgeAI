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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [authActionLoading, setAuthActionLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

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
      (_event, currentSession) => {
        if (!isMounted) return;
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

