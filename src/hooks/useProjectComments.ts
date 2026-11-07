import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  COMMENTS_PAGE_SIZE,
  createComment,
  deleteComment,
  fetchComments,
  fetchReplies,
  updateComment,
} from '../services/engagement';
import {
  fetchCommentLikeSummaries,
  likeComment,
  unlikeComment,
} from '../services/commentLikes';
import { fetchPublicProfiles } from '../services/profiles';
import { LikeSummary, ProjectComment } from '../types/engagement';

interface UseProjectCommentsResult {
  comments: ProjectComment[];
  /** Public display names by user id (from public.profiles); may be partial. */
  displayNames: Record<string, string>;
  /** Avatar storage paths by user id (from public.profiles); may be partial. */
  avatarPaths: Record<string, string>;
  /** Top-level comments total (drives paging). */
  total: number;
  /** Every comment including replies (shown as the comment count). */
  allTotal: number;
  /** Replies by top-level comment id, oldest first. */
  replies: Record<string, ProjectComment[]>;
  /** False until the replies migration is applied. */
  repliesSupported: boolean;
  /** Comment like state by comment id (top-level + replies). */
  commentLikes: Record<string, LikeSummary>;
  commentLikesSupported: boolean;
  commentLikePending: Record<string, true>;
  toggleCommentLike: (commentId: string) => void;
  addReply: (parentId: string, content: string) => Promise<string | null>;
  loading: boolean;
  /** Load error (mutations report their own errors via return value). */
  error: string | null;
  /** True while a create / edit / delete request is in flight. */
  mutating: boolean;
  hasMore: boolean;
  loadingMore: boolean;
  loadMoreError: string | null;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
  addComment: (content: string) => Promise<string | null>;
  editComment: (commentId: string, content: string) => Promise<string | null>;
  removeComment: (commentId: string) => Promise<string | null>;
}

/** Appends `next` to `prev`, skipping ids already present. */
const mergeUnique = (prev: ProjectComment[], next: ProjectComment[]): ProjectComment[] => {
  const seen = new Set(prev.map((c) => c.id));
  return [...prev, ...next.filter((c) => !seen.has(c.id))];
};

/**
 * Paged comments for one repository (newest first). Mutations resolve to an
 * error string (or null on success) and re-fetch afterwards, keeping however
 * many comments were already loaded so the list doesn't collapse to page 1.
 */
export const useProjectComments = (repositoryId: string): UseProjectCommentsResult => {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [comments, setComments] = useState<ProjectComment[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [allTotal, setAllTotal] = useState<number>(0);
  const [replies, setReplies] = useState<Record<string, ProjectComment[]>>({});
  const [repliesSupported, setRepliesSupported] = useState<boolean>(false);
  const [commentLikes, setCommentLikes] = useState<Record<string, LikeSummary>>({});
  const [commentLikesSupported, setCommentLikesSupported] = useState<boolean>(false);
  const [commentLikePending, setCommentLikePending] = useState<Record<string, true>>({});
  const commentLikesRef = useRef(commentLikes);
  commentLikesRef.current = commentLikes;
  const likePendingRef = useRef<Set<string>>(new Set());
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [mutating, setMutating] = useState<boolean>(false);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const [displayNames, setDisplayNames] = useState<Record<string, string>>({});
  const [avatarPaths, setAvatarPaths] = useState<Record<string, string>>({});
  // User ids already looked up (found or not), so each is fetched once.
  const requestedNameIds = useRef<Set<string>>(new Set());

  const mounted = useRef(true);
  const mutatingRef = useRef(false);
  const loadingMoreRef = useRef(false);
  const commentsRef = useRef(comments);
  commentsRef.current = comments;
  // Bumped by every refresh; stale refresh / load-more responses are ignored.
  const fetchSeq = useRef(0);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  /** Reloads the newest `windowSize` comments, replacing the list. */
  const loadWindow = useCallback(async (windowSize: number) => {
    const seq = ++fetchSeq.current;
    const result = await fetchComments(repositoryId, 0, windowSize);
    if (!mounted.current || seq !== fetchSeq.current) return;
    if (result.error || !result.data) {
      setError(result.error || 'Failed to load comments.');
    } else {
      setError(null);
      setLoadMoreError(null);
      const page = result.data;
      setRepliesSupported(page.repliesSupported);
      let nextReplies: Record<string, ProjectComment[]> = {};
      if (page.repliesSupported && page.comments.length > 0) {
        const r = await fetchReplies(page.comments.map((c) => c.id));
        if (!mounted.current || seq !== fetchSeq.current) return;
        if (r.data) nextReplies = r.data;
      }
      setComments(page.comments);
      setReplies(nextReplies);
      setTotal(page.total);
      setAllTotal(page.allTotal);
    }
    setLoading(false);
  }, [repositoryId]);

  const refresh = useCallback(
    () => loadWindow(Math.max(COMMENTS_PAGE_SIZE, commentsRef.current.length)),
    [loadWindow]
  );

  useEffect(() => {
    setLoading(true);
    setComments([]);
    commentsRef.current = [];
    refresh();
  }, [refresh]);

  const loadMore = useCallback(async () => {
    if (loadingMoreRef.current) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    setLoadMoreError(null);
    const seq = fetchSeq.current;
    try {
      const result = await fetchComments(repositoryId, commentsRef.current.length);
      // A refresh replaced the list meanwhile; this page would be misaligned.
      if (!mounted.current || seq !== fetchSeq.current) return;
      if (result.error || !result.data) {
        setLoadMoreError(result.error || 'Failed to load more comments.');
        return;
      }
      const page = result.data;
      const merged = mergeUnique(commentsRef.current, page.comments);
      if (merged.length - commentsRef.current.length < page.comments.length) {
        // Duplicates mean comments were added/removed since the last load and
        // offsets shifted (a comment may have been skipped). Reload the whole
        // window instead, so "Load more" can never get stuck.
        await loadWindow(commentsRef.current.length + COMMENTS_PAGE_SIZE);
        return;
      }
      if (page.repliesSupported && page.comments.length > 0) {
        const r = await fetchReplies(page.comments.map((c) => c.id));
        if (!mounted.current || seq !== fetchSeq.current) return;
        if (r.data) {
          const more = r.data;
          setReplies((prev) => ({ ...prev, ...more }));
        }
      }
      setComments(merged);
      setTotal(page.total);
      setAllTotal(page.allTotal);
    } finally {
      loadingMoreRef.current = false;
      if (mounted.current) setLoadingMore(false);
    }
  }, [repositoryId, loadWindow]);

  // Everything on screen: top-level comments + their replies.
  const allLoaded = useMemo(
    () => [...comments, ...Object.values(replies).flat()],
    [comments, replies]
  );

  // Look up names + avatars for commenters not seen yet (one batched query).
  useEffect(() => {
    const missing = Array.from(
      new Set(allLoaded.map((c) => c.user_id).filter((id) => !requestedNameIds.current.has(id)))
    );
    if (missing.length === 0) return;
    missing.forEach((id) => requestedNameIds.current.add(id));
    fetchPublicProfiles(missing).then((result) => {
      if (!mounted.current) return;
      if (result.error || !result.data) {
        // Allow a retry on the next load; labels fall back meanwhile.
        missing.forEach((id) => requestedNameIds.current.delete(id));
        return;
      }
      const names: Record<string, string> = {};
      const avatars: Record<string, string> = {};
      for (const [id, p] of Object.entries(result.data)) {
        if (p.name) names[id] = p.name;
        if (p.avatarPath) avatars[id] = p.avatarPath;
      }
      setDisplayNames((prev) => ({ ...prev, ...names }));
      setAvatarPaths((prev) => ({ ...prev, ...avatars }));
    });
  }, [allLoaded]);

  // Comment likes for everything loaded (one batched query per change).
  const loadedIdsKey = allLoaded.map((c) => c.id).join(',');
  useEffect(() => {
    const ids = loadedIdsKey ? loadedIdsKey.split(',') : [];
    if (ids.length === 0) return;
    let cancelled = false;
    fetchCommentLikeSummaries(ids, userId).then((res) => {
      if (cancelled || !mounted.current || !res.data) return;
      const { summaries, supported } = res.data;
      setCommentLikesSupported(supported);
      setCommentLikes((prev) => {
        const next = { ...prev };
        // Keep in-flight optimistic values.
        for (const [id, sum] of Object.entries(summaries)) {
          if (!likePendingRef.current.has(id)) next[id] = sum;
        }
        return next;
      });
    });
    return () => {
      cancelled = true;
    };
  }, [loadedIdsKey, userId]);

  const toggleCommentLike = useCallback(
    (commentId: string) => {
      if (likePendingRef.current.has(commentId)) return;
      const current = commentLikesRef.current[commentId];
      if (!current || !userId) return;
      const nextLiked = !current.likedByMe;
      likePendingRef.current.add(commentId);
      setCommentLikePending((p) => ({ ...p, [commentId]: true }));
      setCommentLikes((prev) => ({
        ...prev,
        [commentId]: {
          likedByMe: nextLiked,
          count: Math.max(0, current.count + (nextLiked ? 1 : -1)),
        },
      }));
      (nextLiked ? likeComment(commentId, userId) : unlikeComment(commentId, userId)).then((res) => {
        likePendingRef.current.delete(commentId);
        if (!mounted.current) return;
        if (res.error) setCommentLikes((prev) => ({ ...prev, [commentId]: current })); // roll back
        setCommentLikePending((p) => {
          const n = { ...p };
          delete n[commentId];
          return n;
        });
      });
    },
    [userId]
  );

  const runMutation = useCallback(
    async (op: () => Promise<{ error: string | null }>): Promise<string | null> => {
      if (mutatingRef.current) return 'Please wait for the current action to finish.';
      mutatingRef.current = true;
      setMutating(true);
      try {
        const { error: opError } = await op();
        if (!opError) await refresh();
        return opError;
      } finally {
        mutatingRef.current = false;
        if (mounted.current) setMutating(false);
      }
    },
    [refresh]
  );

  const addComment = useCallback(
    (content: string) => runMutation(() => createComment(repositoryId, userId, content)),
    [runMutation, repositoryId, userId]
  );

  const addReply = useCallback(
    (parentId: string, content: string) =>
      runMutation(() => createComment(repositoryId, userId, content, parentId)),
    [runMutation, repositoryId, userId]
  );

  const editComment = useCallback(
    (commentId: string, content: string) =>
      runMutation(() => updateComment(commentId, userId, content)),
    [runMutation, userId]
  );

  const removeComment = useCallback(
    (commentId: string) => runMutation(() => deleteComment(commentId, userId)),
    [runMutation, userId]
  );

  return {
    comments,
    displayNames,
    avatarPaths,
    total,
    allTotal,
    replies,
    repliesSupported,
    commentLikes,
    commentLikesSupported,
    commentLikePending,
    toggleCommentLike,
    addReply,
    loading,
    error,
    mutating,
    hasMore: comments.length < total,
    loadingMore,
    loadMoreError,
    refresh,
    loadMore,
    addComment,
    editComment,
    removeComment,
  };
};
