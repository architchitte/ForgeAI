import { supabase } from '../../lib/supabase';
import { RepositoryResponse } from './repositories';

/**
 * public.follows — who follows whom (account ids only; never emails).
 * RLS: read for signed-in users; follow / unfollow only as yourself. The
 * database blocks self-follows and duplicates.
 */

export interface FollowCounts {
  followers: number;
  following: number;
}

export interface FollowRow {
  user_id: string;
  created_at: string;
}

const UNIQUE_VIOLATION = '23505';
export const FOLLOW_LIST_LIMIT = 500;
const notSetUp = (code?: string) => code === 'PGRST205' || code === '42P01';

/** Follower / following totals for one user (two head-only count queries). */
export const fetchFollowCounts = async (
  userId: string
): Promise<RepositoryResponse<FollowCounts | null>> => {
  try {
    const [a, b] = await Promise.all([
      supabase.from('follows').select('follower_id', { count: 'exact', head: true }).eq('following_id', userId),
      supabase.from('follows').select('following_id', { count: 'exact', head: true }).eq('follower_id', userId),
    ]);
    const err = a.error || b.error;
    if (err) {
      if (notSetUp(err.code)) return { data: null, error: null }; // not set up: hide counts
      return { data: null, error: err.message };
    }
    return { data: { followers: a.count ?? 0, following: b.count ?? 0 }, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Failed to load follow counts.' };
  }
};

/** Whether `followerId` follows `targetId`; null when follows aren't set up. */
export const fetchIsFollowing = async (
  followerId: string,
  targetId: string
): Promise<RepositoryResponse<boolean | null>> => {
  try {
    const { data, error } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', followerId)
      .eq('following_id', targetId)
      .limit(1);
    if (error) {
      if (notSetUp(error.code)) return { data: null, error: null };
      return { data: null, error: error.message };
    }
    return { data: (data || []).length > 0, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Failed to load follow state.' };
  }
};

export const followUser = async (
  followerId: string | null,
  targetId: string
): Promise<RepositoryResponse<boolean>> => {
  if (!followerId) return { data: null, error: 'You need to be signed in to do that.' };
  if (followerId === targetId) return { data: null, error: "You can't follow yourself." };
  try {
    const { error } = await supabase.from('follows').insert({ follower_id: followerId, following_id: targetId });
    if (error && error.code !== UNIQUE_VIOLATION) {
      console.warn('[FollowsService] follow error:', error.message);
      return { data: null, error: error.message };
    }
    return { data: true, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Failed to follow.' };
  }
};

export const unfollowUser = async (
  followerId: string | null,
  targetId: string
): Promise<RepositoryResponse<boolean>> => {
  if (!followerId) return { data: null, error: 'You need to be signed in to do that.' };
  try {
    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', followerId)
      .eq('following_id', targetId);
    if (error) {
      console.warn('[FollowsService] unfollow error:', error.message);
      return { data: null, error: error.message };
    }
    return { data: true, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Failed to unfollow.' };
  }
};

/** People who follow `userId` (newest first). */
export const fetchFollowers = async (userId: string): Promise<RepositoryResponse<FollowRow[]>> => {
  try {
    const { data, error } = await supabase
      .from('follows')
      .select('follower_id, created_at')
      .eq('following_id', userId)
      .order('created_at', { ascending: false })
      .limit(FOLLOW_LIST_LIMIT);
    if (error) return { data: null, error: error.message };
    return {
      data: ((data || []) as { follower_id: string; created_at: string }[]).map((r) => ({
        user_id: r.follower_id,
        created_at: r.created_at,
      })),
      error: null,
    };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Failed to load followers.' };
  }
};

/** People `userId` follows (newest first). */
export const fetchFollowing = async (userId: string): Promise<RepositoryResponse<FollowRow[]>> => {
  try {
    const { data, error } = await supabase
      .from('follows')
      .select('following_id, created_at')
      .eq('follower_id', userId)
      .order('created_at', { ascending: false })
      .limit(FOLLOW_LIST_LIMIT);
    if (error) return { data: null, error: error.message };
    return {
      data: ((data || []) as { following_id: string; created_at: string }[]).map((r) => ({
        user_id: r.following_id,
        created_at: r.created_at,
      })),
      error: null,
    };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Failed to load following.' };
  }
};
