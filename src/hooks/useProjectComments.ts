import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  COMMENTS_PAGE_SIZE,
  createComment,
  deleteComment,
  fetchComments,
  updateComment,
} from '../services/engagement';
import { fetchDisplayNames } from '../services/profiles';
import { ProjectComment } from '../types/engagement';

interface UseProjectCommentsResult {
  comments: ProjectComment[];
  /** Public display names by user id (from public.profiles); may be partial. */
  displayNames: Record<string, string>;
  total: number;
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
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [mutating, setMutating] = useState<boolean>(false);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const [displayNames, setDisplayNames] = useState<Record<string, string>>({});
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
      setComments(result.data.comments);
      setTotal(result.data.total);
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
      setComments(merged);
      setTotal(page.total);
    } finally {
      loadingMoreRef.current = false;
      if (mounted.current) setLoadingMore(false);
    }
  }, [repositoryId, loadWindow]);

  // Look up display names for commenters not seen yet (one batched query).
  useEffect(() => {
    const missing = Array.from(
      new Set(comments.map((c) => c.user_id).filter((id) => !requestedNameIds.current.has(id)))
    );
    if (missing.length === 0) return;
    missing.forEach((id) => requestedNameIds.current.add(id));
    fetchDisplayNames(missing).then((result) => {
      if (!mounted.current) return;
      if (result.error || !result.data) {
        // Allow a retry on the next load; labels fall back meanwhile.
        missing.forEach((id) => requestedNameIds.current.delete(id));
        return;
      }
      const found = result.data;
      setDisplayNames((prev) => ({ ...prev, ...found }));
    });
  }, [comments]);

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
    total,
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
