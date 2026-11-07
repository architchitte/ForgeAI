import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';
import {
  fetchLikeSummaries,
  likeRepository,
  unlikeRepository,
} from '../services/engagement';
import { LikeSummary } from '../types/engagement';

interface UseRepositoryLikesResult {
  /** Like state per repository id; missing = not loaded yet. */
  likes: Record<string, LikeSummary>;
  /** Ids with a like/unlike request in flight. */
  pendingIds: Record<string, true>;
  /** Re-reads like state for these repositories (one batched request). */
  refreshLikes: (repositoryIds: string[]) => Promise<void>;
  toggleLike: (repositoryId: string) => void;
}

/**
 * Like state for the repository feed, with optimistic toggles.
 *
 * - One in-flight request per repository: taps during a request are ignored,
 *   so rapid tapping can't interleave insert/delete calls.
 * - On failure the optimistic change is rolled back and an Alert is shown.
 * - A refresh that started before a toggle won't overwrite that toggle's
 *   newer state (tracked with a per-repository mutation counter).
 */
export const useRepositoryLikes = (): UseRepositoryLikesResult => {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [likes, setLikes] = useState<Record<string, LikeSummary>>({});
  const [pendingIds, setPendingIds] = useState<Record<string, true>>({});

  const likesRef = useRef(likes);
  likesRef.current = likes;
  const pendingRef = useRef<Set<string>>(new Set());
  const mutationVersion = useRef<Record<string, number>>({});
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // A different signed-in user must never inherit the previous "liked" flags.
  useEffect(() => {
    setLikes({});
  }, [userId]);

  const setPending = (id: string, isPending: boolean) => {
    if (isPending) pendingRef.current.add(id);
    else pendingRef.current.delete(id);
    setPendingIds((prev) => {
      const next = { ...prev };
      if (isPending) next[id] = true;
      else delete next[id];
      return next;
    });
  };

  const refreshLikes = useCallback(
    async (repositoryIds: string[]) => {
      const versionsAtStart = { ...mutationVersion.current };
      const result = await fetchLikeSummaries(repositoryIds, userId);
      if (!mounted.current || !result.data) {
        if (result.error) console.warn('[Likes] Refresh failed:', result.error);
        return;
      }
      const fresh = result.data;
      setLikes((prev) => {
        const next = { ...prev };
        for (const id of Object.keys(fresh)) {
          const changedSince =
            (mutationVersion.current[id] ?? 0) !== (versionsAtStart[id] ?? 0);
          // Keep optimistic / just-confirmed local state over stale server data.
          if (pendingRef.current.has(id) || changedSince) continue;
          next[id] = fresh[id];
        }
        return next;
      });
    },
    [userId]
  );

  const toggleLike = useCallback(
    (repositoryId: string) => {
      if (pendingRef.current.has(repositoryId)) return;
      const current = likesRef.current[repositoryId];
      if (!current) return; // state unknown — don't guess

      if (!userId) {
        Alert.alert('Sign in required', 'Please sign in to like projects.');
        return;
      }

      const nextLiked = !current.likedByMe;
      const optimistic: LikeSummary = {
        likedByMe: nextLiked,
        count: Math.max(0, current.count + (nextLiked ? 1 : -1)),
      };

      mutationVersion.current[repositoryId] =
        (mutationVersion.current[repositoryId] ?? 0) + 1;
      setPending(repositoryId, true);
      setLikes((prev) => ({ ...prev, [repositoryId]: optimistic }));

      const request = nextLiked
        ? likeRepository(repositoryId, userId)
        : unlikeRepository(repositoryId, userId);

      request.then((result) => {
        if (!mounted.current) return;
        if (result.error) {
          // Roll back to the pre-tap state.
          setLikes((prev) => ({ ...prev, [repositoryId]: current }));
          Alert.alert(
            nextLiked ? 'Could not like project' : 'Could not remove like',
            result.error
          );
        }
        setPending(repositoryId, false);
      });
    },
    [userId]
  );

  return { likes, pendingIds, refreshLikes, toggleLike };
};
