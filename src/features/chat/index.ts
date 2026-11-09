export { ChatInboxScreen } from './screens/ChatInboxScreen';
export { ChatThreadScreen } from './screens/ChatThreadScreen';
export { NewChatScreen } from './screens/NewChatScreen';
export { ChatHeaderButton } from './components/ChatHeaderButton';
export { useChatConnection } from './hooks/useChatConnection';
export type { ChatUser, Conversation, Message } from './types';

/** In-app chat location, held by App.tsx alongside the tab state. */
export type ChatRoute =
  | { screen: 'inbox' }
  | { screen: 'new' }
  | { screen: 'thread'; conversationId: string };
