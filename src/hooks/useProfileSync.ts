import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { upsertOwnProfile } from '../services/profiles';

/**
 * Keeps the signed-in user's public.profiles row in step with the name in
 * their auth metadata: on sign-in and after any name edit (AuthContext
 * updates `user` when metadata is saved). Only writes when the name actually
 * changed. Failures are logged and retried on the next change / app start —
 * they never block the UI (e.g. before the profiles table exists).
 */
export const useProfileSync = (): void => {
  const { user } = useAuth();
  const lastSynced = useRef<string | null>(null);

  const userId = user?.id ?? null;
  const meta = user?.user_metadata ?? {};
  const name: string = String(meta.full_name || meta.name || meta.user_name || '').trim();

  useEffect(() => {
    if (!userId) {
      lastSynced.current = null;
      return;
    }
    const key = `${userId}:${name}`;
    if (lastSynced.current === key) return;

    let cancelled = false;
    upsertOwnProfile(userId, name || null).then((result) => {
      if (!cancelled && !result.error) lastSynced.current = key;
    });
    return () => {
      cancelled = true;
    };
  }, [userId, name]);
};
