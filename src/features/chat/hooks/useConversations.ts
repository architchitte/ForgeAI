import { useCallback, useEffect, useRef, useState } from 'react';
import { chatService } from '../services/chatService';
import { Conversation } from '../types';

/** Inbox list, newest activity first; refreshes on service change events. */
export const useConversations = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  const load = useCallback(async () => {
    const r = await chatService.listConversations();
    if (!mounted.current) return;
    if (r.error || !r.data) {
      setError(r.error || 'Could not load conversations.');
      return;
    }
    setError(null);
    setConversations(r.data);
  }, []);

  useEffect(() => {
    mounted.current = true;
    load().finally(() => mounted.current && setLoading(false));
    const unsubscribe = chatService.subscribe((e) => {
      if (e.type === 'conversations-changed') load();
    });
    return () => {
      mounted.current = false;
      unsubscribe();
    };
  }, [load]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    if (mounted.current) setRefreshing(false);
  }, [load]);

  return {
    conversations,
    currentUserId: chatService.getCurrentUserId(),
    loading,
    refreshing,
    error,
    refresh,
  };
};
