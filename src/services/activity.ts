import { supabase } from '../../lib/supabase';
import { RepositoryResponse } from './repositories';

/**
 * Activity on projects: who liked and who commented. Reads project_likes /
 * project_comments (readable by signed-in users under the existing RLS).
 * Batched — never one request per project. Names / pictures are resolved
 * separately via fetchPublicProfiles.
 */

export interface LikeEvent {
  kind: 'like';
  id: string;
  repository_id: string;
  user_id: string;
  created_at: string;
}

export interface CommentEvent {
  kind: 'comment';
  id: string;
  repository_id: string;
  user_id: string;
  content: string;
  created_at: string;
}

export type ActivityEvent = LikeEvent | CommentEvent;

const ID_CHUNK_SIZE = 100;
export const ACTIVITY_LIMIT = 100;
export const LIKERS_LIMIT = 200;

/**
 * Latest likes + comments on the given projects (excluding the viewer's own
 * actions), newest first, up to ACTIVITY_LIMIT of each kind.
 */
export const fetchActivityForRepositories = async (
  repositoryIds: string[],
  excludeUserId: string | null
): Promise<RepositoryResponse<ActivityEvent[]>> => {
  if (repositoryIds.length === 0) return { data: [], error: null };
  try {
    const events: ActivityEvent[] = [];
    for (let i = 0; i < repositoryIds.length; i += ID_CHUNK_SIZE) {
      const chunk = repositoryIds.slice(i, i + ID_CHUNK_SIZE);

      let likes = supabase
        .from('project_likes')
        .select('id, repository_id, user_id, created_at')
        .in('repository_id', chunk)
        .order('created_at', { ascending: false })
        .limit(ACTIVITY_LIMIT);
      let comments = supabase
        .from('project_comments')
        .select('id, repository_id, user_id, content, created_at')
        .in('repository_id', chunk)
        .order('created_at', { ascending: false })
        .limit(ACTIVITY_LIMIT);
      if (excludeUserId) {
        likes = likes.neq('user_id', excludeUserId);
        comments = comments.neq('user_id', excludeUserId);
      }

      const [l, c] = await Promise.all([likes, comments]);
      if (l.error || c.error) {
        const msg = (l.error || c.error)!.message;
        console.warn('[ActivityService] fetch error:', msg);
        return { data: null, error: msg || 'Failed to load activity.' };
      }
      for (const row of (l.data || []) as Omit<LikeEvent, 'kind'>[]) events.push({ kind: 'like', ...row });
      for (const row of (c.data || []) as Omit<CommentEvent, 'kind'>[]) {
        events.push({ kind: 'comment', ...row });
      }
    }
    events.sort((a, b) => b.created_at.localeCompare(a.created_at));
    return { data: events, error: null };
  } catch (err: any) {
    console.warn('[ActivityService] Unexpected error:', err);
    return { data: null, error: err?.message || 'Failed to load activity.' };
  }
};

/** Who liked one project, newest first. */
export const fetchLikers = async (
  repositoryId: string
): Promise<RepositoryResponse<{ user_id: string; created_at: string }[]>> => {
  try {
    const { data, error } = await supabase
      .from('project_likes')
      .select('user_id, created_at')
      .eq('repository_id', repositoryId)
      .order('created_at', { ascending: false })
      .limit(LIKERS_LIMIT);
    if (error) {
      console.warn('[ActivityService] fetchLikers error:', error.message);
      return { data: null, error: error.message };
    }
    return { data: (data || []) as { user_id: string; created_at: string }[], error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Failed to load likes.' };
  }
};
