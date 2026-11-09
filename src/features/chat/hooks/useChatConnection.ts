import { useEffect } from 'react';
import { chatService } from '../services/chatService';

/**
 * Ties the chat session to the signed-in user: connects on sign-in, and
 * disconnects (closing the realtime channel and clearing cached chat data)
 * on sign-out or account switch. Mount once, in the authenticated shell.
 */
export const useChatConnection = (userId: string | null | undefined) => {
  useEffect(() => {
    if (!userId) return;
    chatService.connect(userId);
    return () => chatService.disconnect();
  }, [userId]);
};
