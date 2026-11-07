import { supabase } from '../../lib/supabase';
import { RepositoryResponse } from './repositories';
import {
  COMMENT_MAX_LENGTH,
  COMMENT_MIN_LENGTH,
  LikeSummary,
  ProjectComment,
} from '../types/engagement';

/**
 * Likes & comments on repositories (public.project_likes / public.project_comments).
 *
 * Follows the same contract as repositories.ts: every function resolves to
 * { data, error } and never throws. Ownership is enforced by RLS; the
 * user_id filters below are only there so a blocked write is detected
 * (0 rows affected) instead of silently "succeeding".
 */

// Postgres unique_violation: the (repository_id, user_id) like already exists.
const UNIQUE_VIOLATION = '23505';
// Ids per `.in()` filter, keeping request URLs well under length limits.
const ID_CHUNK_SIZE = 100;
// PostgREST's default max rows per response.
const PAGE_SIZE = 1000;
// Comments loaded per page ("Load more" fetches the next page).
export const COMMENTS_PAGE_SIZE = 20;

interface DbError {
  code?: string;
  message?: string;
  status?: number;
}

/** Turns auth / RLS failures into messages a user can act on. */
const toFriendlyError = (err: DbError | null | undefined, fallback: string): string => {
  const message = err?.message || '';
  if (
    err?.status === 401 ||
    err?.code === 'PGRST301' ||
    /jwt|token.*expired|not authenticated/i.test(message)
  ) {
    return 'Your session has expired. Please sign in again.';
  }
  if (err?.code === '42501' || /row-level security/i.test(message)) {
    return 'You do not have permission to perform this action.';
  }
  if (err?.code === '23514') {
    return `Comments must be between ${COMMENT_MIN_LENGTH} and ${COMMENT_MAX_LENGTH} characters.`;
  }
  return message || fallback;
};

const requireUserId = (userId: string | null | undefined): string | null =>
  userId && userId.length > 0 ? userId : null;

const NOT_SIGNED_IN = 'You need to be signed in to do that.';

/** Trims and validates comment text; returns an error string when invalid. */
export const validateCommentContent = (raw: string): string | null => {
  const trimmed = raw.trim();
  if (trimmed.length < COMMENT_MIN_LENGTH) return 'Comment cannot be empty.';
  if (trimmed.length > COMMENT_MAX_LENGTH) {
    return `Comments can be at most ${COMMENT_MAX_LENGTH} characters.`;
  }
  return null;
};

// ---------------------------------------------------------------------------
// Likes
// ---------------------------------------------------------------------------

/**
 * Like counts + "liked by me" for a set of repositories, in as few requests
 * as possible: one query per 100 ids (paginated past 1000 rows), selecting
 * only the two columns needed. Avoids one request per card.
 */
export const fetchLikeSummaries = async (
  repositoryIds: string[],
  currentUserId: string | null
): Promise<RepositoryResponse<Record<string, LikeSummary>>> => {
  const summaries: Record<string, LikeSummary> = {};
  for (const id of repositoryIds) summaries[id] = { count: 0, likedByMe: false };
  if (repositoryIds.length === 0) return { data: summaries, error: null };

  try {
    for (let i = 0; i < repositoryIds.length; i += ID_CHUNK_SIZE) {
      const chunk = repositoryIds.slice(i, i + ID_CHUNK_SIZE);

      for (let from = 0; ; from += PAGE_SIZE) {
        const { data, error } = await supabase
          .from('project_likes')
          .select('repository_id, user_id')
          .in('repository_id', chunk)
          .order('id', { ascending: true })
          .range(from, from + PAGE_SIZE - 1);

        if (error) {
          console.error('[EngagementService] fetchLikeSummaries error:', error.message);
          return { data: null, error: toFriendlyError(error, 'Failed to load likes.') };
        }

        const rows = (data || []) as { repository_id: string; user_id: string }[];
        for (const row of rows) {
          const summary = summaries[row.repository_id];
          if (!summary) continue;
          summary.count += 1;
          if (currentUserId && row.user_id === currentUserId) summary.likedByMe = true;
        }
        if (rows.length < PAGE_SIZE) break;
      }
    }

    return { data: summaries, error: null };
  } catch (err: any) {
    console.error('[EngagementService] Unexpected likes fetch error:', err);
    return { data: null, error: err?.message || 'Failed to load likes.' };
  }
};

/** Likes a repository. An existing like (unique violation) counts as success. */
export const likeRepository = async (
  repositoryId: string,
  userId: string | null | undefined
): Promise<RepositoryResponse<boolean>> => {
  const uid = requireUserId(userId);
  if (!uid) return { data: null, error: NOT_SIGNED_IN };

  try {
    const { error } = await supabase
      .from('project_likes')
      .insert({ repository_id: repositoryId, user_id: uid });

    if (error && error.code !== UNIQUE_VIOLATION) {
      console.error('[EngagementService] likeRepository error:', error.message);
      return { data: null, error: toFriendlyError(error, 'Failed to like project.') };
    }
    return { data: true, error: null };
  } catch (err: any) {
    console.error('[EngagementService] Unexpected like error:', err);
    return { data: null, error: err?.message || 'Failed to like project.' };
  }
};

/** Removes the current user's like. Already-unliked counts as success. */
export const unlikeRepository = async (
  repositoryId: string,
  userId: string | null | undefined
): Promise<RepositoryResponse<boolean>> => {
  const uid = requireUserId(userId);
  if (!uid) return { data: null, error: NOT_SIGNED_IN };

  try {
    const { error } = await supabase
      .from('project_likes')
      .delete()
      .eq('repository_id', repositoryId)
      .eq('user_id', uid);

    if (error) {
      console.error('[EngagementService] unlikeRepository error:', error.message);
      return { data: null, error: toFriendlyError(error, 'Failed to unlike project.') };
    }
    return { data: true, error: null };
  } catch (err: any) {
    console.error('[EngagementService] Unexpected unlike error:', err);
    return { data: null, error: err?.message || 'Failed to unlike project.' };
  }
};

// ---------------------------------------------------------------------------
// Comments
// ---------------------------------------------------------------------------

/**
 * A newest-first window of comments (rows offset..offset+limit-1) for a
 * repository, plus the exact total count.
 */
export const fetchComments = async (
  repositoryId: string,
  offset = 0,
  limit = COMMENTS_PAGE_SIZE
): Promise<RepositoryResponse<{ comments: ProjectComment[]; total: number }>> => {
  try {
    const { data, error, count } = await supabase
      .from('project_comments')
      .select('id, repository_id, user_id, content, created_at, updated_at', {
        count: 'exact',
      })
      .eq('repository_id', repositoryId)
      .order('created_at', { ascending: false })
      // id tiebreaker keeps page boundaries stable for equal timestamps.
      .order('id', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('[EngagementService] fetchComments error:', error.message);
      return { data: null, error: toFriendlyError(error, 'Failed to load comments.') };
    }

    const comments = (data || []) as ProjectComment[];
    return { data: { comments, total: count ?? comments.length }, error: null };
  } catch (err: any) {
    console.error('[EngagementService] Unexpected comments fetch error:', err);
    return { data: null, error: err?.message || 'Failed to load comments.' };
  }
};

export const createComment = async (
  repositoryId: string,
  userId: string | null | undefined,
  content: string
): Promise<RepositoryResponse<ProjectComment>> => {
  const uid = requireUserId(userId);
  if (!uid) return { data: null, error: NOT_SIGNED_IN };
  const invalid = validateCommentContent(content);
  if (invalid) return { data: null, error: invalid };

  try {
    const { data, error } = await supabase
      .from('project_comments')
      .insert({ repository_id: repositoryId, user_id: uid, content: content.trim() })
      .select('id, repository_id, user_id, content, created_at, updated_at')
      .single();

    if (error) {
      console.error('[EngagementService] createComment error:', error.message);
      return { data: null, error: toFriendlyError(error, 'Failed to post comment.') };
    }
    return { data: data as ProjectComment, error: null };
  } catch (err: any) {
    console.error('[EngagementService] Unexpected comment insert error:', err);
    return { data: null, error: err?.message || 'Failed to post comment.' };
  }
};

/** Edits the user's own comment, setting updated_at explicitly (no trigger assumed). */
export const updateComment = async (
  commentId: string,
  userId: string | null | undefined,
  content: string
): Promise<RepositoryResponse<ProjectComment>> => {
  const uid = requireUserId(userId);
  if (!uid) return { data: null, error: NOT_SIGNED_IN };
  const invalid = validateCommentContent(content);
  if (invalid) return { data: null, error: invalid };

  try {
    const { data, error } = await supabase
      .from('project_comments')
      .update({ content: content.trim(), updated_at: new Date().toISOString() })
      .eq('id', commentId)
      .eq('user_id', uid)
      .select('id, repository_id, user_id, content, created_at, updated_at');

    if (error) {
      console.error('[EngagementService] updateComment error:', error.message);
      return { data: null, error: toFriendlyError(error, 'Failed to update comment.') };
    }
    const rows = (data || []) as ProjectComment[];
    if (rows.length === 0) {
      return { data: null, error: 'Comment not found, or you can only edit your own comments.' };
    }
    return { data: rows[0], error: null };
  } catch (err: any) {
    console.error('[EngagementService] Unexpected comment update error:', err);
    return { data: null, error: err?.message || 'Failed to update comment.' };
  }
};

export const deleteComment = async (
  commentId: string,
  userId: string | null | undefined
): Promise<RepositoryResponse<boolean>> => {
  const uid = requireUserId(userId);
  if (!uid) return { data: null, error: NOT_SIGNED_IN };

  try {
    const { data, error } = await supabase
      .from('project_comments')
      .delete()
      .eq('id', commentId)
      .eq('user_id', uid)
      .select('id');

    if (error) {
      console.error('[EngagementService] deleteComment error:', error.message);
      return { data: null, error: toFriendlyError(error, 'Failed to delete comment.') };
    }
    if (!data || data.length === 0) {
      return { data: null, error: 'Comment not found, or you can only delete your own comments.' };
    }
    return { data: true, error: null };
  } catch (err: any) {
    console.error('[EngagementService] Unexpected comment delete error:', err);
    return { data: null, error: err?.message || 'Failed to delete comment.' };
  }
};

// ---------------------------------------------------------------------------
// Realtime
// ---------------------------------------------------------------------------

let likesChannelSeq = 0;

/**
 * Calls `onChange` whenever any like is added or removed. Events are only a
 * signal — callers re-read counts — because with RLS, DELETE payloads carry
 * just the row id. Does nothing until project_likes is in the
 * supabase_realtime publication. Returns an unsubscribe function.
 */
export const subscribeToLikeChanges = (onChange: () => void): (() => void) => {
  const channel = supabase
    .channel(`project-likes-${++likesChannelSeq}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'project_likes' },
      () => onChange()
    )
    .subscribe((status, err) => {
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.warn('[EngagementService] Likes realtime unavailable:', err?.message || status);
      }
    });

  return () => {
    supabase.removeChannel(channel).catch(() => {});
  };
};

/**
 * Comment totals for several repositories in batched requests (one per 100
 * ids, paginated past 1000 rows) — used by "My Projects" on the profile.
 */
export const fetchCommentCounts = async (
  repositoryIds: string[]
): Promise<RepositoryResponse<Record<string, number>>> => {
  const counts: Record<string, number> = {};
  for (const id of repositoryIds) counts[id] = 0;
  if (repositoryIds.length === 0) return { data: counts, error: null };
  try {
    for (let i = 0; i < repositoryIds.length; i += ID_CHUNK_SIZE) {
      const chunk = repositoryIds.slice(i, i + ID_CHUNK_SIZE);
      for (let from = 0; ; from += PAGE_SIZE) {
        const { data, error } = await supabase
          .from('project_comments')
          .select('repository_id')
          .in('repository_id', chunk)
          .order('id', { ascending: true })
          .range(from, from + PAGE_SIZE - 1);
        if (error) {
          console.error('[EngagementService] fetchCommentCounts error:', error.message);
          return { data: null, error: toFriendlyError(error, 'Failed to load comment counts.') };
        }
        const rows = (data || []) as { repository_id: string }[];
        for (const row of rows) counts[row.repository_id] = (counts[row.repository_id] ?? 0) + 1;
        if (rows.length < PAGE_SIZE) break;
      }
    }
    return { data: counts, error: null };
  } catch (err: any) {
    console.error('[EngagementService] Unexpected comment count error:', err);
    return { data: null, error: err?.message || 'Failed to load comment counts.' };
  }
};
