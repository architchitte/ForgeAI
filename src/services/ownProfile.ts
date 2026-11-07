import { supabase } from '../../lib/supabase';
import { RepositoryResponse } from './repositories';
import { extensionForMime } from './screenshotFiles';
import type { ProfileDetails, PublicProfile } from '../types/profile';
import type { PickedScreenshot as PickedImage } from '../types/screenshot';

/**
 * The signed-in user's own profile: public row (display name + avatar) in
 * public.profiles, private details in public.profile_details, avatar files in
 * the `profile-avatars` bucket at <uid>/<unique file>. Same { data, error }
 * never-throw contract as the other services; ownership is enforced by RLS
 * and Storage policies (auth.uid()), never decided by the client.
 */

export const AVATAR_BUCKET = 'profile-avatars';
const PROFILE_COLUMNS = 'id, display_name, avatar_path, updated_at, created_at';
const DETAILS_COLUMNS = 'id, city, country, bio, created_at, updated_at';

const friendly = (err: { code?: string; message?: string } | null, fallback: string) => {
  const message = err?.message || '';
  if (err?.code === 'PGRST301' || /jwt|token.*expired|not authenticated/i.test(message)) {
    return 'Your session has expired. Please sign in again.';
  }
  if (err?.code === '42501' || /row-level security|unauthorized/i.test(message)) {
    return 'You can only change your own profile.';
  }
  if (err?.code === 'PGRST205' || err?.code === '42703' || /bucket not found/i.test(message)) {
    return 'Profile storage is not set up yet.';
  }
  if (err?.code === '23514') return 'One of the values is too long or invalid.';
  if (/payload too large|exceeded the maximum/i.test(message)) return 'The image is larger than 5 MB.';
  if (/mime type/i.test(message)) return 'Unsupported file type. Use JPG, PNG, or WebP.';
  return message || fallback;
};

export const getAvatarUrl = (path: string): string =>
  supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path).data.publicUrl;

/** The user's public profile row (null when it doesn't exist yet). */
export const fetchOwnProfile = async (
  userId: string
): Promise<RepositoryResponse<PublicProfile | null>> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select(PROFILE_COLUMNS)
      .eq('id', userId)
      .maybeSingle();
    if (error) {
      console.warn('[OwnProfileService] fetchOwnProfile error:', error.message);
      return { data: null, error: friendly(error, 'Failed to load profile.') };
    }
    return { data: (data as PublicProfile | null) ?? null, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Failed to load profile.' };
  }
};

/** The user's private details (null when never saved). */
export const fetchProfileDetails = async (
  userId: string
): Promise<RepositoryResponse<ProfileDetails | null>> => {
  try {
    const { data, error } = await supabase
      .from('profile_details')
      .select(DETAILS_COLUMNS)
      .eq('id', userId)
      .maybeSingle();
    if (error) {
      console.warn('[OwnProfileService] fetchProfileDetails error:', error.message);
      return { data: null, error: friendly(error, 'Failed to load profile details.') };
    }
    return { data: (data as ProfileDetails | null) ?? null, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Failed to load profile details.' };
  }
};

/** Creates or updates the user's own details; blank values are stored as null. */
export const saveProfileDetails = async (
  userId: string,
  input: { city: string; country: string; bio: string }
): Promise<RepositoryResponse<ProfileDetails>> => {
  const clean = (v: string) => v.trim().replace(/[ \t]+/g, ' ') || null;
  try {
    const { data, error } = await supabase
      .from('profile_details')
      .upsert(
        {
          id: userId,
          city: clean(input.city),
          country: clean(input.country),
          bio: input.bio.trim() || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      )
      .select(DETAILS_COLUMNS)
      .single();
    if (error) {
      console.warn('[OwnProfileService] saveProfileDetails error:', error.message);
      return { data: null, error: friendly(error, 'Failed to save profile details.') };
    }
    return { data: data as ProfileDetails, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Failed to save profile details.' };
  }
};

const removeAvatarObject = async (path: string): Promise<boolean> => {
  for (let attempt = 0; attempt < 2; attempt++) {
    const { error } = await supabase.storage.from(AVATAR_BUCKET).remove([path]);
    if (!error) return true;
    console.warn('[OwnProfileService] avatar file remove failed:', error.message);
  }
  return false;
};

/**
 * Upload or replace the avatar, safely ordered:
 *  1. upload under a new unique name (the old picture stays untouched);
 *  2. point profiles.avatar_path at it (creating the row if missing) — if
 *     that fails the new file is deleted, so no broken data is left behind;
 *  3. only then delete the old file (best effort, retried once).
 */
export const uploadAvatar = async (
  userId: string,
  picked: PickedImage,
  previousPath: string | null
): Promise<RepositoryResponse<{ profile: PublicProfile; warning: string | null }>> => {
  const path = `${userId}/${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 10)}.${extensionForMime(picked.mimeType)}`;
  try {
    const up = await supabase.storage.from(AVATAR_BUCKET).upload(path, picked.data, {
      contentType: picked.mimeType,
      upsert: false,
      cacheControl: '31536000', // names are never reused
    });
    if (up.error) {
      console.warn('[OwnProfileService] avatar upload error:', up.error.message);
      return { data: null, error: friendly(up.error, 'Failed to upload picture.') };
    }

    const { data, error } = await supabase
      .from('profiles')
      .upsert(
        { id: userId, avatar_path: path, updated_at: new Date().toISOString() },
        { onConflict: 'id' }
      )
      .select(PROFILE_COLUMNS)
      .single();
    if (error || !data) {
      await removeAvatarObject(path);
      if (error) console.warn('[OwnProfileService] avatar save error:', error.message);
      return { data: null, error: friendly(error, 'Failed to save picture.') };
    }

    let warning: string | null = null;
    if (previousPath && previousPath !== path && !(await removeAvatarObject(previousPath))) {
      warning = 'Your new picture is live, but the previous file could not be deleted.';
    }
    return { data: { profile: data as PublicProfile, warning }, error: null };
  } catch (err: any) {
    await removeAvatarObject(path).catch(() => false);
    return { data: null, error: err?.message || 'Failed to upload picture.' };
  }
};

/** Clears the avatar (profile row first, then the file) → default avatar. */
export const removeAvatar = async (
  userId: string,
  path: string
): Promise<RepositoryResponse<{ warning: string | null }>> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update({ avatar_path: null, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select('id');
    if (error) {
      console.warn('[OwnProfileService] avatar clear error:', error.message);
      return { data: null, error: friendly(error, 'Failed to remove picture.') };
    }
    if (!data || data.length === 0) {
      return { data: null, error: 'You can only change your own profile.' };
    }
    const removed = await removeAvatarObject(path);
    return {
      data: { warning: removed ? null : 'Picture removed, but its file could not be deleted.' },
      error: null,
    };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Failed to remove picture.' };
  }
};
