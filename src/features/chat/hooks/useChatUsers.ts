import { useCallback, useDeferredValue, useEffect, useState } from 'react';
import { chatService } from '../services/chatService';
import { ChatResponse, ChatUser, Conversation } from '../types';

/** Users matching a name / institution query (all users when empty). */
export const useChatUsers = (query: string) => {
  const deferred = useDeferredValue(query.trim());
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    chatService.searchUsers(deferred).then((r) => {
      if (cancelled) return;
      setError(r.error);
      setUsers(r.data ?? []);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [deferred]);

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
