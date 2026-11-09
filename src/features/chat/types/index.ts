/**
 * Chat domain types. UI code depends only on these and on `ChatService`,
 * never on a concrete service, so a Supabase-backed service can replace the
 * placeholder without touching screens or components.
 */

export interface ChatUser {
  id: string;
  fullName: string;
  avatarUrl: string | null;
  /** College / institution, shown as secondary information. */
  institution: string | null;
  /** The account was deleted: history stays visible, replies are disabled. */
  isDeleted?: boolean;
}

export type MessageStatus = 'sending' | 'sent' | 'failed';

export interface Message {
  id: string;
  conversationId: string;
  /** DELETED_SENDER_ID when the sender's account was deleted. */
  senderId: string;
  body: string;
  /** ISO timestamp. */
  createdAt: string;
  status: MessageStatus;
  /** Client-generated id used to reconcile optimistic messages. */
  clientId?: string;
}

/** One-to-one conversation, seen from the current user's side. */
export interface Conversation {
  id: string;
  participant: ChatUser;
  lastMessage: Message | null;
  unreadCount: number;
  /** ISO timestamp of the latest activity; conversations sort by this. */
  updatedAt: string;
}

/** Cursor-based page of messages, newest first. */
export interface MessagePage {
  messages: Message[];
  /** Pass as `before` to load older messages; null when none remain. */
  nextCursor: string | null;
}

/** Same shape as the app's other services: never throws. */
export interface ChatResponse<T> {
  data: T | null;
  error: string | null;
}

/** senderId used for messages whose author deleted their account. */
export const DELETED_SENDER_ID = 'deleted-user';

export type ChatEvent =
  | { type: 'conversations-changed' }
  | { type: 'message-upserted'; message: Message }
  /** The cached unread total changed (header badge). */
  | { type: 'unread-changed' }
  /** Events may have been missed (reconnect / app foreground): re-fetch. */
  | { type: 'resync' };

export interface ChatService {
  /** Start the session for the signed-in user (opens the realtime channel). */
  connect(userId: string): void;
  /** End the session: closes the channel and clears all cached chat state. */
  disconnect(): void;
  getCurrentUserId(): string;
  listConversations(): Promise<ChatResponse<Conversation[]>>;
  getConversation(conversationId: string): Promise<ChatResponse<Conversation>>;
  listMessages(
    conversationId: string,
    options?: { before?: string | null; limit?: number }
  ): Promise<ChatResponse<MessagePage>>;
  sendMessage(
    conversationId: string,
    body: string,
    clientId: string
  ): Promise<ChatResponse<Message>>;
  markConversationRead(conversationId: string): Promise<ChatResponse<null>>;
  getUnreadTotal(): number;
  searchUsers(query: string): Promise<ChatResponse<ChatUser[]>>;
  /** Existing 1:1 conversation with the user, or a new (empty) one. */
  getOrCreateConversation(userId: string): Promise<ChatResponse<Conversation>>;
  /** Change notifications (fed by Realtime in the Supabase service). */
  subscribe(listener: (event: ChatEvent) => void): () => void;
}
