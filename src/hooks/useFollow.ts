import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';
import {
  FollowCounts,
  fetchFollowCounts,
  fetchIsFollowing,
  followUser,
  unfollowUser,
} from '../services/follows';

/**
 * Follow state for one user: counts, whether I follow them, and an
 * optimistic toggle (one request at a time, rolled back on failure).
 * `supported` is false until the follows migration is applied.
 */
export const useFollow = (targetUserId: string | null | undefined) => {
  const { user } = useAuth();
  const me = user?.id ?? null;
  const [counts, setCounts] = useState<FollowCounts | null>(null);
  const [isFollowing, setIsFollowing] = useState<boolean>(false);
  const [supported, setSupported] = useState<boolean>(false);
  const [pending, setPending] = useState<boolean>(false);
  const pendingRef = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    if (!targetUserId) return;
    const [c, f] = await Promise.all([
      fetchFollowCounts(targetUserId),
      me && me !== targetUserId ? fetchIsFollowing(me, targetUserId) : Promise.resolve({ data: false, error: null }),
    ]);
    if (!mounted.current) return;
    setSupported(!!c.data);
    if (c.data) setCounts(c.data);
    if (typeof f.data === 'boolean') setIsFollowing(f.data);
  }, [targetUserId, me]);

  useEffect(() => {
    setCounts(null);
    setIsFollowing(false);
    refresh();
  }, [refresh]);

  const toggle = useCallback(() => {
    if (!targetUserId || !me || me === targetUserId || pendingRef.current || !counts) return;
    const prev = { following: isFollowing, counts };
    const next = !isFollowing;
    pendingRef.current = true;
    setPending(true);
    setIsFollowing(next);
    setCounts({ ...counts, followers: Math.max(0, counts.followers + (next ? 1 : -1)) });
    (next ? followUser(me, targetUserId) : unfollowUser(me, targetUserId)).then((res) => {
      pendingRef.current = false;
      if (!mounted.current) return;
      setPending(false);
      if (res.error) {
        setIsFollowing(prev.following);
        setCounts(prev.counts);
        Alert.alert(next ? 'Could not follow' : 'Could not unfollow', res.error);
      }
    });
  }, [targetUserId, me, isFollowing, counts]);

  return {
    counts,
    isFollowing,
    supported,
    pending,
    isSelf: !!me && me === targetUserId,
    toggle,
    refresh,
  };
};
