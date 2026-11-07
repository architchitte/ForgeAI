import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Session, User, AuthResponse } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';

// Ensure WebBrowser can handle callbacks properly
WebBrowser.maybeCompleteAuthSession();

/**
 * Returns the deep link redirect URL for Google OAuth callback.
 * - In Expo Go: Returns exp://<ip>:8081/--/login-callback
 * - In Development Client / Standalone: Returns forgeai://login-callback
 */
export const getRedirectUrl = (): string => {
  const isExpoGo =
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

  if (isExpoGo) {
    const expoGoUri = AuthSession.makeRedirectUri({
      path: 'login-callback',
    });
    console.log('[ForgeAI Auth] Detected Expo Go runtime. Redirect URI:', expoGoUri);
    return expoGoUri;
  }

  const nativeUri = AuthSession.makeRedirectUri({
    scheme: 'forgeai',
    path: 'login-callback',
  });
  console.log('[ForgeAI Auth] Detected Native runtime. Redirect URI:', nativeUri);
  return nativeUri;
};

/**
 * Parses access tokens or PKCE code from deep link redirect URL.
 */
export const extractTokensOrCodeFromUrl = (url: string) => {
  const parsed = new URL(url);

  // 1. Extract query params (for PKCE flow or standard params)
  const queryParams = parsed.searchParams;
  const queryError =
    queryParams.get('error_description') || queryParams.get('error');

  // 2. Extract hash fragment params (for Supabase implicit grant flow: #access_token=...&refresh_token=...)
  let hashParams = new URLSearchParams();
  if (parsed.hash) {
    const rawHash = parsed.hash.startsWith('#')
      ? parsed.hash.substring(1)
      : parsed.hash;
    hashParams = new URLSearchParams(rawHash);
  }

  const hashError =
    hashParams.get('error_description') || hashParams.get('error');

  if (queryError || hashError) {
    throw new Error(
      decodeURIComponent(queryError || hashError || 'Authentication failed.')
    );
  }

  const code = queryParams.get('code') || hashParams.get('code');
  const accessToken =
    queryParams.get('access_token') || hashParams.get('access_token');
  const refreshToken =
    queryParams.get('refresh_token') || hashParams.get('refresh_token');

  return { code, accessToken, refreshToken };
};

/**
 * Exchanges auth code or sets session using tokens received from deep link callback.
 */
export const createSessionFromUrl = async (
  url: string
): Promise<Session | null> => {
  console.log('[ForgeAI Auth] Processing callback URL:', url);
  const { code, accessToken, refreshToken } = extractTokensOrCodeFromUrl(url);

  console.log('[ForgeAI Auth] Extracted credentials:', {
    hasCode: Boolean(code),
    hasAccessToken: Boolean(accessToken),
    hasRefreshToken: Boolean(refreshToken),
  });

  if (code) {
    console.log('[ForgeAI Auth] Exchanging code for session with Supabase...');
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error('[ForgeAI Auth] exchangeCodeForSession failed:', error.message);
      throw error;
    }
    console.log('[ForgeAI Auth] Code exchange successful. User:', data.session?.user?.email);
    return data.session;
  }

  if (accessToken && refreshToken) {
    console.log('[ForgeAI Auth] Setting session with tokens...');
    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) {
      console.error('[ForgeAI Auth] setSession failed:', error.message);
      throw error;
    }
    console.log('[ForgeAI Auth] Session set successful. User:', data.session?.user?.email);
    return data.session;
  }

  console.warn('[ForgeAI Auth] No valid code or token pair found in redirect URL.');
  return null;
};

/**
 * Register a user with email and password.
 */
export const signUpWithEmail = async (
  email: string,
  password: string
): Promise<{ user: User | null; session: Session | null; needsEmailVerification: boolean }> => {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
  });

  if (error) throw error;

  const needsEmailVerification = !!data.user && !data.session;
  return {
    user: data.user,
    session: data.session,
    needsEmailVerification,
  };
};

/**
 * Sign in an existing user with email and password.
 */
export const signInWithEmail = async (
  email: string,
  password: string
): Promise<AuthResponse['data']> => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error) throw error;
  return data;
};

/**
 * Initiates Google OAuth flow using Supabase native mobile deep linking.
 */
export const signInWithGoogle = async (): Promise<Session | null> => {
  const redirectUrl = getRedirectUrl();
  console.log('[ForgeAI Auth] Starting Google OAuth with redirect URL:', redirectUrl);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUrl,
      skipBrowserRedirect: true,
    },
  });

  if (error) {
    console.error('[ForgeAI Auth] signInWithOAuth failed:', error.message);
    throw error;
  }

  if (!data?.url) {
    throw new Error('Supabase did not return an OAuth authorization URL.');
  }

  console.log('[ForgeAI Auth] Opening auth browser session...');
  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
  console.log('[ForgeAI Auth] openAuthSessionAsync returned:', JSON.stringify(result));

  if (result.type === 'success' && result.url) {
    return await createSessionFromUrl(result.url);
  }

  if (result.type === 'cancel' || result.type === 'dismiss') {
    console.log('[ForgeAI Auth] User dismissed or cancelled the auth sheet.');
  }

  return null;
};

/**
 * Sign out the current user and clear local session.
 */
export const signOut = async (): Promise<void> => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

/**
 * Fetch currently active session from persistent storage.
 */
export const getInitialSession = async (): Promise<Session | null> => {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    console.warn('[AuthService] Error retrieving stored session:', error.message);
    return null;
  }
  return data.session;
};

// ---------------------------------------------------------------------------
// Password recovery & change (Supabase Auth only — passwords are never stored
// or logged by the app).
// ---------------------------------------------------------------------------

/**
 * Sends Supabase's password-recovery email. The link returns to the app via
 * the same, already allow-listed redirect as OAuth (forgeai://login-callback
 * or the Expo Go equivalent); AuthContext recognises it as a recovery.
 */
export const sendPasswordResetEmail = async (email: string): Promise<void> => {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: getRedirectUrl(),
  });
  if (error) throw error;
};

/**
 * Re-authenticates with the current password before a change. Supabase has
 * no "check password" call, so this signs in again as the same account; a
 * wrong password fails without changing anything.
 */
export const verifyCurrentPassword = async (email: string, password: string): Promise<void> => {
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) {
    throw new Error(
      /invalid login credentials/i.test(error.message)
        ? 'Your current password is incorrect.'
        : error.message
    );
  }
};

/** Sets a new password for the signed-in (or recovering) user. */
export const updatePassword = async (newPassword: string): Promise<void> => {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
};
