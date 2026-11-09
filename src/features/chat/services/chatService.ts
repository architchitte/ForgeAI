import { ChatService } from '../types';
import { createInMemoryChatService } from './inMemoryChatService';

/**
 * The single chat service instance used by the hooks. It is currently an
 * empty in-memory placeholder. To go live, implement `ChatService`
 * (see ../types) against Supabase and swap it in here; screens and
 * components don't change.
 */
export const chatService: ChatService = createInMemoryChatService();
