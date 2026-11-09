import { useSyncExternalStore } from 'react';
import { chatService } from '../services/chatService';

const subscribe = (onChange: () => void) => chatService.subscribe(onChange);
const getSnapshot = () => chatService.getUnreadTotal();

/** Total unread messages across conversations (for the header badge). */
export const useUnreadTotal = (): number => useSyncExternalStore(subscribe, getSnapshot);
