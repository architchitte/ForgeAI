import { useCallback, useEffect, useState } from 'react';
import { chatService } from '../services/chatService';
import { ChatResponse, ChatUser, Conversation } from '../types';

const SEARCH_DEBOUNCE_MS = 250;
/** Shorter queries return nothing (no browsing the whole user directory). */
export const MIN_USER_QUERY_LENGTH = 2;

/** People matching a name / institution query, debounced. */
export const useChatUsers = (query: string) => {
  const q = query.trim();
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (q.length < MIN_USER_QUERY_LENGTH) {
      setUsers([]);
      setError(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(() => {
      chatService.searchUsers(q).then((r) => {
        if (cancelled) return;
        setError(r.error);
        setUsers(r.data ?? []);
        setLoading(false);
      });
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [q]);

  return { users, loading, error };
};

/** Opens (or creates) the 1:1 conversation with a user. */
export const useStartConversation = () => {
  const [starting, setStarting] = useState<boolean>(false);
  const start = useCallback(async (userId: string): Promise<ChatResponse<Conversation>> => {
    setStarting(true);
    const r = await chatService.getOrCreateConversation(userId);
    setStarting(false);
    return r;
  }, []);
  return { start, starting };
};
