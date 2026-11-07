import { supabase } from '../../lib/supabase';
import { RepositoryResponse } from './repositories';

/**
 * public.profiles — one public display name per user (id = auth.uid()).
 * Never stores or returns emails. Same { data, error } never-throw contract
 * as the other services.
 */

const ID_CHUNK_SIZE = 100;
export const DISPLAY_NAME_MAX_LENGTH = 80;

/** Creates or updates the signed-in user's own profile row. */
export const upsertOwnProfile = async (
  userId: string,
  displayName: string | null
): Promise<RepositoryResponse<boolean>> => {
  const name = displayName?.trim().slice(0, DISPLAY_NAME_MAX_LENGTH) || null;
  try {
    const { error } = await supabase
      .from('profiles')
      .upsert(
        { id: userId, display_name: name, updated_at: new Date().toISOString() },
        { onConflict: 'id' }
      );

    if (error) {
      console.warn('[ProfilesService] upsertOwnProfile error:', error.message);
      return { data: null, error: error.message };
    }
    return { data: true, error: null };
  } catch (err: any) {
    console.warn('[ProfilesService] Unexpected upsert error:', err);
    return { data: null, error: err?.message || 'Failed to save profile.' };
  }
};

export interface PublicProfileSummary {
  name: string | null;
  avatarPath: string | null;
}

/**
 * Names + avatar paths for a set of user ids (e.g. commenters), batched —
 * one request per 100 ids. Falls back to names only if the avatar column
 * doesn't exist yet (profile migration not applied).
 */
export const fetchPublicProfiles = async (
  userIds: string[]
): Promise<RepositoryResponse<Record<string, PublicProfileSummary>>> => {
  const result: Record<string, PublicProfileSummary> = {};
  const unique = Array.from(new Set(userIds));
  if (unique.length === 0) return { data: result, error: null };

  let columns = 'id, display_name, avatar_path';
  try {
    for (let i = 0; i < unique.length; i += ID_CHUNK_SIZE) {
      const chunk = unique.slice(i, i + ID_CHUNK_SIZE);
      let { data, error } = await supabase.from('profiles').select(columns).in('id', chunk);
      if (error?.code === '42703' && columns.includes('avatar_path')) {
        columns = 'id, display_name';
        ({ data, error } = await supabase.from('profiles').select(columns).in('id', chunk));
      }
      if (error) {
        console.warn('[ProfilesService] fetchPublicProfiles error:', error.message);
        return { data: null, error: error.message };
      }
      for (const row of (data || []) as unknown as {
        id: string;
        display_name: string | null;
        avatar_path?: string | null;
      }[]) {
        result[row.id] = {
          name: row.display_name?.trim() || null,
          avatarPath: row.avatar_path ?? null,
        };
      }
    }
    return { data: result, error: null };
  } catch (err: any) {
    console.warn('[ProfilesService] Unexpected fetchPublicProfiles error:', err);
    return { data: null, error: err?.message || 'Failed to load profiles.' };
  }
};
