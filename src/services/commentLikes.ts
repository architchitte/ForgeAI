import { supabase } from '../../lib/supabase';
import { RepositoryResponse } from './repositories';
import { LikeSummary } from '../types/engagement';

/**
 * public.comment_likes — likes on comments and replies. Same contract as the
 * other services ({ data, error }, never throws); RLS: read for signed-in
 * users, insert/delete only as yourself. Batched — never one request per
 * comment.
 */

const ID_CHUNK_SIZE = 100;
const PAGE_SIZE = 1000;
const UNIQUE_VIOLATION = '23505';

/** True when the comment_likes table exists (migration applied). */
const notSetUp = (code?: string) => code === 'PGRST205' || code === '42P01';

/** Counts + "liked by me" for many comments. `supported` false = table missing. */
export const fetchCommentLikeSummaries = async (
  commentIds: string[],
  currentUserId: string | null
): Promise<RepositoryResponse<{ summaries: Record<string, LikeSummary>; supported: boolean }>> => {
  const summaries: Record<string, LikeSummary> = {};
  for (const id of commentIds) summaries[id] = { count: 0, likedByMe: false };
  if (commentIds.length === 0) return { data: { summaries, supported: true }, error: null };
  try {
    for (let i = 0; i < commentIds.length; i += ID_CHUNK_SIZE) {
      const chunk = commentIds.slice(i, i + ID_CHUNK_SIZE);
      for (let from = 0; ; from += PAGE_SIZE) {
        const { data, error } = await supabase
          .from('comment_likes')
          .select('comment_id, user_id')
          .in('comment_id', chunk)
          .order('id', { ascending: true })
          .range(from, from + PAGE_SIZE - 1);
        if (error) {
          if (notSetUp(error.code)) return { data: { summaries, supported: false }, error: null };
          console.warn('[CommentLikesService] fetch error:', error.message);
          return { data: null, error: error.message };
        }
        const rows = (data || []) as { comment_id: string; user_id: string }[];
        for (const r of rows) {
          const s = summaries[r.comment_id];
          if (!s) continue;
          s.count += 1;
          if (currentUserId && r.user_id === currentUserId) s.likedByMe = true;
        }
        if (rows.length < PAGE_SIZE) break;
      }
    }
    return { data: { summaries, supported: true }, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Failed to load comment likes.' };
  }
};

export const likeComment = async (
  commentId: string,
  userId: string | null
): Promise<RepositoryResponse<boolean>> => {
  if (!userId) return { data: null, error: 'You need to be signed in to do that.' };
  try {
    const { error } = await supabase.from('comment_likes').insert({ comment_id: commentId, user_id: userId });
    if (error && error.code !== UNIQUE_VIOLATION) {
      console.warn('[CommentLikesService] like error:', error.message);
      return { data: null, error: error.message };
    }
    return { data: true, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Failed to like comment.' };
  }
};

export const unlikeComment = async (
  commentId: string,
  userId: string | null
): Promise<RepositoryResponse<boolean>> => {
  if (!userId) return { data: null, error: 'You need to be signed in to do that.' };
  try {
    const { error } = await supabase
      .from('comment_likes')
      .delete()
      .eq('comment_id', commentId)
      .eq('user_id', userId);
    if (error) {
      console.warn('[CommentLikesService] unlike error:', error.message);
      return { data: null, error: error.message };
    }
    return { data: true, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Failed to remove like.' };
  }
};

/** Who liked one comment, newest first. */
export const fetchCommentLikers = async (
  commentId: string
): Promise<RepositoryResponse<{ user_id: string; created_at: string }[]>> => {
  try {
    const { data, error } = await supabase
      .from('comment_likes')
      .select('user_id, created_at')
      .eq('comment_id', commentId)
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) return { data: null, error: error.message };
    return { data: (data || []) as { user_id: string; created_at: string }[], error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Failed to load likes.' };
  }
};
