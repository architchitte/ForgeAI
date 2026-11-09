import {
  ChatEvent,
  ChatResponse,
  ChatService,
  ChatUser,
  Conversation,
  Message,
  MessagePage,
} from '../types';

/**
 * Placeholder chat service: an empty, in-memory store that implements the
 * `ChatService` contract (conversations, paginated messages, sending,
 * unread counts, change events). It holds no seed data, so every screen
 * shows its empty state until a real backend is wired in via chatService.ts.
 * State lives for the app session only.
 */

const LOG = '[ChatService]';
const DEFAULT_PAGE_SIZE = 20;
const LOCAL_USER_ID = 'local-user';

const ok = <T,>(data: T): ChatResponse<T> => ({ data, error: null });
const fail = <T,>(error: string): ChatResponse<T> => {
  console.warn(LOG, error);
  return { data: null, error };
};
const norm = (v: string | null | undefined) => (v || '').toLocaleLowerCase().trim();

interface StoredConversation {
  id: string;
  participantId: string;
  unreadCount: number;
}

export const createInMemoryChatService = (): ChatService => {
  const users = new Map<string, ChatUser>();
  const conversations = new Map<string, StoredConversation>();
  /** Oldest first, per conversation. */
  const messages = new Map<string, Message[]>();
  const listeners = new Set<(e: ChatEvent) => void>();
  let idCounter = 0;

  const emit = (event: ChatEvent) => {
    listeners.forEach((l) => {
      try {
        l(event);
      } catch (err: any) {
        console.warn(LOG, 'listener failed:', err?.message || err);
      }
    });
  };

  const toConversation = (c: StoredConversation): Conversation | null => {
    const participant = users.get(c.participantId);
    if (!participant) return null;
    const list = messages.get(c.id) ?? [];
    const last = list[list.length - 1] ?? null;
    return {
      id: c.id,
      participant,
      lastMessage: last,
      unreadCount: c.unreadCount,
      updatedAt: last?.createdAt ?? new Date(0).toISOString(),
    };
  };

  return {
    getCurrentUserId: () => LOCAL_USER_ID,

    async listConversations() {
      const list = Array.from(conversations.values())
        .map(toConversation)
        .filter((c): c is Conversation => !!c && !!c.lastMessage)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      return ok(list);
    },

    async getConversation(conversationId) {
      const c = conversations.get(conversationId);
      const conv = c ? toConversation(c) : null;
      return conv ? ok(conv) : fail('Conversation not found.');
    },

    async listMessages(conversationId, options) {
      if (!conversations.has(conversationId)) return fail('Conversation not found.');
      const limit = options?.limit ?? DEFAULT_PAGE_SIZE;
      const all = messages.get(conversationId) ?? [];
      let end = all.length;
      if (options?.before) {
        const idx = all.findIndex((m) => m.id === options.before);
        if (idx === -1) return fail('Invalid pagination cursor.');
        end = idx;
      }
      const start = Math.max(0, end - limit);
      const page: MessagePage = {
        messages: all.slice(start, end).reverse(),
        nextCursor: start > 0 ? all[start].id : null,
      };
      return ok(page);
    },

    async sendMessage(conversationId, body, clientId) {
      const text = body.trim();
      if (!text) return fail('Message is empty.');
      if (!conversations.has(conversationId)) return fail('Conversation not found.');
      const message: Message = {
        id: `msg-${Date.now()}-${++idCounter}`,
        conversationId,
        senderId: LOCAL_USER_ID,
        body: text,
        createdAt: new Date().toISOString(),
        status: 'sent',
        clientId,
      };
      const list = messages.get(conversationId) ?? [];
      list.push(message);
      messages.set(conversationId, list);
      emit({ type: 'message-upserted', message });
      emit({ type: 'conversations-changed' });
      return ok(message);
    },

    async markConversationRead(conversationId) {
      const c = conversations.get(conversationId);
      if (!c) return fail('Conversation not found.');
      if (c.unreadCount > 0) {
        c.unreadCount = 0;
        emit({ type: 'conversations-changed' });
      }
      return ok(null);
    },

    getUnreadTotal() {
      let total = 0;
      conversations.forEach((c) => {
        if ((messages.get(c.id)?.length ?? 0) > 0) total += c.unreadCount;
      });
      return total;
    },

    async searchUsers(query) {
      const q = norm(query);
      const list = Array.from(users.values())
        .filter((u) => !q || norm(u.fullName).includes(q) || norm(u.institution).includes(q))
        .sort((a, b) => a.fullName.localeCompare(b.fullName));
      return ok(list);
    },

    async getOrCreateConversation(userId) {
      if (!users.has(userId)) return fail('User not found.');
      let c = Array.from(conversations.values()).find((x) => x.participantId === userId);
      if (!c) {
        c = { id: `conv-${userId}-${Date.now()}`, participantId: userId, unreadCount: 0 };
        conversations.set(c.id, c);
        messages.set(c.id, []);
      }
      const conv = toConversation(c);
      return conv ? ok(conv) : fail('Could not open conversation.');
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
};
