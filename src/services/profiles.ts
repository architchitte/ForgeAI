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

/**
 * Display names for a set of user ids, batched (one request per 100 ids).
 * Users without a profile or name are simply absent from the result.
 */
export const fetchDisplayNames = async (
  userIds: string[]
): Promise<RepositoryResponse<Record<string, string>>> => {
  const names: Record<string, string> = {};
  const unique = Array.from(new Set(userIds));
  if (unique.length === 0) return { data: names, error: null };

  try {
    for (let i = 0; i < unique.length; i += ID_CHUNK_SIZE) {
      const chunk = unique.slice(i, i + ID_CHUNK_SIZE);
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name')
        .in('id', chunk);

      if (error) {
        console.warn('[ProfilesService] fetchDisplayNames error:', error.message);
        return { data: null, error: error.message };
      }
      for (const row of (data || []) as { id: string; display_name: string | null }[]) {
        const name = row.display_name?.trim();
        if (name) names[row.id] = name;
      }
    }
    return { data: names, error: null };
  } catch (err: any) {
    console.warn('[ProfilesService] Unexpected fetch error:', err);
    return { data: null, error: err?.message || 'Failed to load display names.' };
  }
};
