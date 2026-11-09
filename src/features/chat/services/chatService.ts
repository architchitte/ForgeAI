import { isSupabaseConfigured } from '../../../../lib/supabase';
import { ChatService } from '../types';
import { createInMemoryChatService } from './inMemoryChatService';
import { createSupabaseChatService } from './supabaseChatService';

/**
 * The single chat service instance used by the hooks. Supabase when the
 * client is configured; otherwise the empty in-memory placeholder so the UI
 * still renders. Screens and components never import a concrete service.
 */
export const chatService: ChatService = isSupabaseConfigured
  ? createSupabaseChatService()
  : createInMemoryChatService();
