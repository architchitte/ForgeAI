import { AppState, NativeEventSubscription } from 'react-native';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../../../../lib/supabase';
import { COMMUNITY_MEMBER_LABEL } from '../../../constants/identity';
import { getAvatarUrl } from '../../../services/ownProfile';
import {
  ChatEvent,
  ChatResponse,
  ChatService,
  ChatUser,
  Conversation,
  DELETED_SENDER_ID,
  Message,
} from '../types';

/**
 * Supabase-backed chat (see sql/2026-11-09_chat_messaging.sql).
 *
 * - Reads: RLS-protected SELECT on public.messages; inbox, unread total and
 *   people search via SECURITY DEFINER RPCs (they read names/colleges the
 *   client cannot).
 * - Writes: RPCs only (send_message, get_or_create_direct_conversation,
 *   mark_conversation_read). The client never writes tables directly.
 * - Realtime: ONE private Broadcast channel per signed-in user,
 *   'chat:user:<uid>', fed by a database trigger after each insert. Messages
 *   are persisted before they are broadcast, so on reconnect / app foreground
 *   the service emits 'resync' and the hooks re-fetch.
 */

const LOG = '[ChatService]';
const DEFAULT_PAGE_SIZE = 20;
const CONVERSATION_PAGE_SIZE = 50;
const READ_DEBOUNCE_MS = 400;
const UNREAD_DEBOUNCE_MS = 300;
const DELETED_USER_LABEL = 'Deleted user';
const MESSAGE_COLUMNS = 'id, conversation_id, sender_id, body, client_id, created_at';

interface MessageRow {
  id: string;
  conversation_id: string;
  sender_id: string | null;
  body: string;
  client_id: string | null;
  created_at: string;
}

interface ConversationRow {
  conversation_id: string;
  conversation_type: string;
  last_message_at: string | null;
  other_user_id: string | null;
  other_display_name: string | null;
  other_avatar_path: string | null;
  other_college: string | null;
  last_message_id: string | null;
  last_message_sender_id: string | null;
  last_message_body: string | null;
  last_message_client_id: string | null;
  last_message_created_at: string | null;
  unread_count: number | null;
}

interface UserRow {
  user_id: string;
  display_name: string | null;
  avatar_path: string | null;
  college: string | null;
}

const ok = <T,>(data: T): ChatResponse<T> => ({ data, error: null });
const fail = <T,>(context: string, err: any, fallback: string): ChatResponse<T> => {
  console.warn(LOG, `${context}:`, err?.message || err);
  return { data: null, error: err?.message || fallback };
};

const toMessage = (r: MessageRow): Message => ({
  id: r.id,
  conversationId: r.conversation_id,
  senderId: r.sender_id ?? DELETED_SENDER_ID,
  body: r.body,
  createdAt: r.created_at,
  status: 'sent',
  ...(r.client_id ? { clientId: r.client_id } : {}),
});

const toUser = (id: string, name: string | null, avatarPath: string | null, college: string | null): ChatUser => ({
  id,
  fullName: name?.trim() || COMMUNITY_MEMBER_LABEL,
  avatarUrl: avatarPath ? getAvatarUrl(avatarPath) : null,
  institution: college?.trim() || null,
});

const toConversation = (r: ConversationRow): Conversation => ({
  id: r.conversation_id,
  participant: r.other_user_id
    ? toUser(r.other_user_id, r.other_display_name, r.other_avatar_path, r.other_college)
    : {
        id: `deleted:${r.conversation_id}`,
        fullName: DELETED_USER_LABEL,
        avatarUrl: null,
        institution: null,
        isDeleted: true,
      },
  lastMessage:
    r.last_message_id && r.last_message_created_at
      ? toMessage({
          id: r.last_message_id,
          conversation_id: r.conversation_id,
          sender_id: r.last_message_sender_id,
          body: r.last_message_body ?? '',
          client_id: r.last_message_client_id,
          created_at: r.last_message_created_at,
        })
      : null,
  unreadCount: r.unread_count ?? 0,
  updatedAt: r.last_message_at ?? new Date(0).toISOString(),
});

/** Opaque keyset cursor: the raw timestamp keeps microsecond precision. */
const encodeCursor = (m: MessageRow) => `${m.created_at}|${m.id}`;
const decodeCursor = (cursor: string) => {
  const i = cursor.lastIndexOf('|');
  return i > 0 ? { createdAt: cursor.slice(0, i), id: cursor.slice(i + 1) } : null;
};

export const createSupabaseChatService = (): ChatService => {
  const listeners = new Set<(e: ChatEvent) => void>();
  let userId: string | null = null;
  let channel: RealtimeChannel | null = null;
  let appStateSub: NativeEventSubscription | null = null;
  let hasSubscribed = false;
  let unreadTotal = 0;
  let unreadTimer: ReturnType<typeof setTimeout> | null = null;
  const readTimers = new Map<string, ReturnType<typeof setTimeout>>();
  /** Bumped on connect/disconnect so late responses from an old session are dropped. */
  let session = 0;

  const emit = (event: ChatEvent) => {
    listeners.forEach((l) => {
      try {
        l(event);
      } catch (err: any) {
        console.warn(LOG, 'listener failed:', err?.message || err);
      }
    });
  };

  const refreshUnread = () => {
    if (unreadTimer) clearTimeout(unreadTimer);
    unreadTimer = setTimeout(async () => {
      unreadTimer = null;
      if (!userId) return;
      const mySession = session;
      const { data, error } = await supabase.rpc('get_unread_total');
      if (mySession !== session) return;
      if (error) {
        console.warn(LOG, 'unread total:', error.message);
        return;
      }
      const next = typeof data === 'number' ? data : 0;
      if (next !== unreadTotal) {
        unreadTotal = next;
        emit({ type: 'unread-changed' });
      }
    }, UNREAD_DEBOUNCE_MS);
  };

  const resync = () => {
    refreshUnread();
    emit({ type: 'resync' });
    emit({ type: 'conversations-changed' });
  };

  const handleBroadcast = (payload: unknown) => {
    const row = payload as Partial<MessageRow> | null;
    if (!row?.id || !row.conversation_id || typeof row.body !== 'string' || !row.created_at) return;
    emit({ type: 'message-upserted', message: toMessage(row as MessageRow) });
    emit({ type: 'conversations-changed' });
    refreshUnread();
  };

  const openChannel = async (uid: string, mySession: number) => {
    // Private channels are authorized with the user's JWT.
    const { data } = await supabase.auth.getSession();
    if (mySession !== session) return;
    await supabase.realtime.setAuth(data.session?.access_token ?? null);
    if (mySession !== session) return;

    channel = supabase
      .channel(`chat:user:${uid}`, { config: { private: true } })
      .on('broadcast', { event: 'message_created' }, ({ payload }) => handleBroadcast(payload))
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          // Re-subscribed after a drop: anything sent meanwhile was missed.
          if (hasSubscribed) resync();
          hasSubscribed = true;
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn(LOG, 'realtime unavailable:', err?.message || status);
        }
      });
  };

  const closeChannel = () => {
    if (channel) supabase.removeChannel(channel).catch(() => {});
    channel = null;
    hasSubscribed = false;
  };

  const currentUser = (): string | null => userId;

  const service: ChatService = {
    connect(uid) {
      if (userId === uid) return;
      service.disconnect();
      userId = uid;
      const mySession = ++session;
      refreshUnread();
      openChannel(uid, mySession).catch((err: any) =>
        console.warn(LOG, 'realtime connect failed:', err?.message || err)
      );
      let appState = AppState.currentState;
      appStateSub = AppState.addEventListener('change', (next) => {
        // The socket may have slept in the background.
        if (appState !== 'active' && next === 'active') resync();
        appState = next;
      });
    },

    disconnect() {
      session++;
      closeChannel();
      appStateSub?.remove();
      appStateSub = null;
      if (unreadTimer) clearTimeout(unreadTimer);
      unreadTimer = null;
      readTimers.forEach((t) => clearTimeout(t));
      readTimers.clear();
      const hadUser = userId !== null;
      userId = null;
      unreadTotal = 0;
      if (hadUser) {
        emit({ type: 'unread-changed' });
        emit({ type: 'conversations-changed' });
      }
    },

    getCurrentUserId: () => currentUser() ?? '',

    async listConversations() {
      if (!currentUser()) return ok([]);
      try {
        const { data, error } = await supabase.rpc('list_conversations', { p_limit: CONVERSATION_PAGE_SIZE });
        if (error) return fail('list conversations', error, 'Could not load conversations.');
        return ok(((data ?? []) as ConversationRow[]).map(toConversation));
      } catch (err: any) {
        return fail('list conversations', err, 'Could not load conversations.');
      }
    },

    async getConversation(conversationId) {
      try {
        const { data, error } = await supabase.rpc('list_conversations', {
          p_limit: 1,
          p_conversation_id: conversationId,
        });
        if (error) return fail('get conversation', error, 'Could not open this conversation.');
        const row = ((data ?? []) as ConversationRow[])[0];
        return row ? ok(toConversation(row)) : { data: null, error: 'Conversation not found.' };
      } catch (err: any) {
        return fail('get conversation', err, 'Could not open this conversation.');
      }
    },

    async listMessages(conversationId, options) {
      const limit = options?.limit ?? DEFAULT_PAGE_SIZE;
      try {
        let query = supabase
          .from('messages')
          .select(MESSAGE_COLUMNS)
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: false })
          .order('id', { ascending: false })
          .limit(limit + 1);
        if (options?.before) {
          const c = decodeCursor(options.before);
          if (!c) return { data: null, error: 'Invalid pagination cursor.' };
          query = query.or(`created_at.lt."${c.createdAt}",and(created_at.eq."${c.createdAt}",id.lt.${c.id})`);
        }
        const { data, error } = await query;
        if (error) return fail('list messages', error, 'Could not load messages.');
        const rows = (data ?? []) as MessageRow[];
        const page = rows.slice(0, limit);
        return ok({
          messages: page.map(toMessage),
          nextCursor: rows.length > limit && page.length > 0 ? encodeCursor(page[page.length - 1]) : null,
        });
      } catch (err: any) {
        return fail('list messages', err, 'Could not load messages.');
      }
    },

    async sendMessage(conversationId, body, clientId) {
      const text = body.trim();
      if (!text) return { data: null, error: 'Message is empty.' };
      try {
        const { data, error } = await supabase.rpc('send_message', {
          p_conversation_id: conversationId,
          p_body: text,
          p_client_id: clientId,
        });
        if (error || !data) return fail('send message', error, 'Message not sent.');
        const message = toMessage(data as MessageRow);
        // Keeps the inbox current even if the broadcast is delayed.
        emit({ type: 'conversations-changed' });
        return ok(message);
      } catch (err: any) {
        return fail('send message', err, 'Message not sent.');
      }
    },

    async markConversationRead(conversationId) {
      // Debounced: a burst of incoming messages makes one request.
      const existing = readTimers.get(conversationId);
      if (existing) clearTimeout(existing);
      readTimers.set(
        conversationId,
        setTimeout(async () => {
          readTimers.delete(conversationId);
          const { error } = await supabase.rpc('mark_conversation_read', { p_conversation_id: conversationId });
          if (error) {
            console.warn(LOG, 'mark read:', error.message);
            return;
          }
          refreshUnread();
          emit({ type: 'conversations-changed' });
        }, READ_DEBOUNCE_MS)
      );
      return ok(null);
    },

    getUnreadTotal: () => unreadTotal,

    async searchUsers(query) {
      const q = query.trim();
      if (q.length < 2) return ok([]);
      try {
        const { data, error } = await supabase.rpc('search_chat_users', { p_query: q, p_limit: 20 });
        if (error) return fail('search users', error, 'Could not search people.');
        return ok(
          ((data ?? []) as UserRow[]).map((u) => toUser(u.user_id, u.display_name, u.avatar_path, u.college))
        );
      } catch (err: any) {
        return fail('search users', err, 'Could not search people.');
      }
    },

    async getOrCreateConversation(otherUserId) {
      try {
        const { data, error } = await supabase.rpc('get_or_create_direct_conversation', {
          p_other_user: otherUserId,
        });
        if (error || typeof data !== 'string') return fail('start conversation', error, 'Could not open chat.');
        return service.getConversation(data);
      } catch (err: any) {
        return fail('start conversation', err, 'Could not open chat.');
      }
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };

  return service;
};
