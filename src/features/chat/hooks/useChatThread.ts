import { useCallback, useEffect, useRef, useState } from 'react';
import { chatService } from '../services/chatService';
import { Conversation, Message } from '../types';

const PAGE_SIZE = 20;

const time = (m: Message) => Date.parse(m.createdAt) || 0;

/**
 * Replace by id / client id, otherwise insert in time order (newest first).
 * Realtime can deliver out of order, so new messages aren't assumed newest.
 */
const upsert = (list: Message[], m: Message): Message[] => {
  const i = list.findIndex(
    (x) => x.id === m.id || (!!m.clientId && x.clientId === m.clientId)
  );
  if (i !== -1) {
    const next = list.slice();
    next[i] = m;
    return next;
  }
  const t = time(m);
  const at = list.findIndex((x) => time(x) <= t);
  if (at === 0) return [m, ...list];
  if (at === -1) return [...list, m];
  return [...list.slice(0, at), m, ...list.slice(at)];
};

const newClientId = () => `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

/**
 * One conversation: paginated messages (newest first), optimistic sending
 * and read-marking while the thread is open.
 */
export const useChatThread = (conversationId: string) => {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingOlder, setLoadingOlder] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);
  const loadingOlderRef = useRef(false);
  const currentUserId = chatService.getCurrentUserId();

  useEffect(() => {
    mounted.current = true;
    setLoading(true);
    setMessages([]);
    setNextCursor(null);

    (async () => {
      const [conv, page] = await Promise.all([
        chatService.getConversation(conversationId),
        chatService.listMessages(conversationId, { limit: PAGE_SIZE }),
      ]);
      if (!mounted.current) return;
      if (conv.error || !conv.data) {
        setError(conv.error || 'Could not open this conversation.');
      } else {
        setConversation(conv.data);
        setError(page.error);
        setMessages(page.data?.messages ?? []);
        setNextCursor(page.data?.nextCursor ?? null);
        chatService.markConversationRead(conversationId);
      }
      setLoading(false);
    })();

    // Missed events (reconnect / foreground): merge the newest page back in.
    // Already-loaded older pages and pending sends are kept.
    const resync = async () => {
      const page = await chatService.listMessages(conversationId, { limit: PAGE_SIZE });
      if (!mounted.current || !page.data) return;
      const fresh = page.data.messages;
      setMessages((prev) => fresh.reduceRight((acc, m) => upsert(acc, m), prev));
      chatService.markConversationRead(conversationId);
    };

    const unsubscribe = chatService.subscribe((e) => {
      if (e.type === 'resync') {
        resync();
        return;
      }
      if (e.type !== 'message-upserted' || e.message.conversationId !== conversationId) return;
      setMessages((prev) => upsert(prev, e.message));
      // The thread is on screen, so incoming messages are read right away.
      if (e.message.senderId !== currentUserId) chatService.markConversationRead(conversationId);
    });

    return () => {
      mounted.current = false;
      unsubscribe();
    };
  }, [conversationId, currentUserId]);

  const loadOlder = useCallback(async () => {
    if (!nextCursor || loadingOlderRef.current) return;
    loadingOlderRef.current = true;
    setLoadingOlder(true);
    const r = await chatService.listMessages(conversationId, { before: nextCursor, limit: PAGE_SIZE });
    loadingOlderRef.current = false;
    if (!mounted.current) return;
    setLoadingOlder(false);
    if (r.error || !r.data) return;
    const older = r.data.messages;
    setMessages((prev) => [...prev, ...older]);
    setNextCursor(r.data.nextCursor);
  }, [conversationId, nextCursor]);

  const deliver = useCallback(
    async (body: string, clientId: string) => {
      const r = await chatService.sendMessage(conversationId, body, clientId);
      if (!mounted.current) return;
      if (r.data) {
        const sent = r.data;
        setMessages((prev) => upsert(prev, sent));
      } else {
        setMessages((prev) =>
          prev.map((m) => (m.clientId === clientId ? { ...m, status: 'failed' } : m))
        );
      }
    },
    [conversationId]
  );

  /** Shows the message immediately; returns false for empty input. */
  const send = useCallback(
    (text: string): boolean => {
      const body = text.trim();
      if (!body) return false;
      const clientId = newClientId();
      const optimistic: Message = {
        id: clientId,
        clientId,
        conversationId,
        senderId: currentUserId,
        body,
        createdAt: new Date().toISOString(),
        status: 'sending',
      };
      setMessages((prev) => [optimistic, ...prev]);
      deliver(body, clientId);
      return true;
    },
    [conversationId, currentUserId, deliver]
  );

  const retry = useCallback(
    (message: Message) => {
      if (message.status !== 'failed' || !message.clientId) return;
      const clientId = message.clientId;
      setMessages((prev) =>
        prev.map((m) => (m.clientId === clientId ? { ...m, status: 'sending' } : m))
      );
      deliver(message.body, clientId);
    },
    [deliver]
  );

  return {
    conversation,
    messages,
    currentUserId,
    loading,
    loadingOlder,
    hasOlder: nextCursor !== null,
    error,
    loadOlder,
    send,
    retry,
  };
};
