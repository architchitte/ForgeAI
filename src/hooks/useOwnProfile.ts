import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  fetchOwnProfile,
  fetchProfileDetails,
  removeAvatar,
  saveProfileDetails,
  uploadAvatar,
} from '../services/ownProfile';
import type { ProfileDetails, PublicProfile } from '../types/profile';
import type { PickedScreenshot as PickedImage } from '../types/screenshot';

interface Result {
  profile: PublicProfile | null;
  details: ProfileDetails | null;
  loading: boolean;
  /** Load error (e.g. migration not applied). */
  error: string | null;
  avatarBusy: boolean;
  refresh: () => Promise<void>;
  saveDetails: (input: { city: string; country: string; bio: string }) => Promise<string | null>;
  changeAvatar: (picked: PickedImage) => Promise<{ error: string | null; warning: string | null }>;
  clearAvatar: () => Promise<{ error: string | null; warning: string | null }>;
}

/**
 * The signed-in user's profile row + private details, loaded together (two
 * small requests in parallel) and kept in state after each change. Missing
 * rows are fine: they're created on first save.
 */
export const useOwnProfile = (): Result => {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [details, setDetails] = useState<ProfileDetails | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [avatarBusy, setAvatarBusy] = useState<boolean>(false);
  const profileRef = useRef(profile);
  profileRef.current = profile;
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    if (!userId) return;
    const [p, d] = await Promise.all([fetchOwnProfile(userId), fetchProfileDetails(userId)]);
    if (!mounted.current) return;
    if (p.data !== null || !p.error) setProfile(p.data);
    if (d.data !== null || !d.error) setDetails(d.data);
    setError(p.error || d.error);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    setLoading(true);
    refresh();
  }, [refresh]);

  const saveDetails = useCallback(
    async (input: { city: string; country: string; bio: string }) => {
      if (!userId) return 'You need to be signed in.';
      const res = await saveProfileDetails(userId, input);
      if (res.error || !res.data) return res.error || 'Failed to save profile details.';
      if (mounted.current) setDetails(res.data);
      return null;
    },
    [userId]
  );

  const changeAvatar = useCallback(
    async (picked: PickedImage) => {
      if (!userId) return { error: 'You need to be signed in.', warning: null };
      setAvatarBusy(true);
      const res = await uploadAvatar(userId, picked, profileRef.current?.avatar_path ?? null);
      if (mounted.current) {
        setAvatarBusy(false);
        if (res.data) setProfile(res.data.profile);
      }
      return { error: res.error, warning: res.data?.warning ?? null };
    },
    [userId]
  );

  const clearAvatar = useCallback(async () => {
    const path = profileRef.current?.avatar_path;
    if (!userId || !path) return { error: null, warning: null };
    setAvatarBusy(true);
    const res = await removeAvatar(userId, path);
    if (mounted.current) {
      setAvatarBusy(false);
      if (!res.error) setProfile((p) => (p ? { ...p, avatar_path: null } : p));
    }
    return { error: res.error, warning: res.data?.warning ?? null };
  }, [userId]);

  return { profile, details, loading, error, avatarBusy, refresh, saveDetails, changeAvatar, clearAvatar };
};
