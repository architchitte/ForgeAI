import { Message } from '../types';
import { dayKey, formatDateSeparator } from './chatTime';

/** Messages from one sender this close together render as a group. */
const GROUP_WINDOW_MS = 5 * 60 * 1000;

export type ThreadItem =
  | {
      kind: 'message';
      key: string;
      message: Message;
      isOwn: boolean;
      /** Previous (older) bubble is from the same sender and close in time. */
      joinsOlder: boolean;
      /** Next (newer) bubble is from the same sender and close in time. */
      joinsNewer: boolean;
    }
  | { kind: 'date'; key: string; label: string };

/** Stable key: the client id survives the optimistic → confirmed swap. */
export const messageKey = (m: Message) => m.clientId ?? m.id;

const joins = (a: Message | undefined, b: Message | undefined) =>
  !!a &&
  !!b &&
  a.senderId === b.senderId &&
  dayKey(a.createdAt) === dayKey(b.createdAt) &&
  Math.abs(new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) <= GROUP_WINDOW_MS;

/**
 * Builds rows for an inverted FlatList from messages ordered newest first.
 * A date separator follows (i.e. renders above) the oldest message of a day.
 */
export const buildThreadItems = (messagesNewestFirst: Message[], currentUserId: string): ThreadItem[] => {
  const items: ThreadItem[] = [];
  const n = messagesNewestFirst.length;
  for (let i = 0; i < n; i++) {
    const m = messagesNewestFirst[i];
    const newer = messagesNewestFirst[i - 1];
    const older = messagesNewestFirst[i + 1];
    items.push({
      kind: 'message',
      key: messageKey(m),
      message: m,
      isOwn: m.senderId === currentUserId,
      joinsOlder: joins(m, older),
      joinsNewer: joins(m, newer),
    });
    if (!older || dayKey(older.createdAt) !== dayKey(m.createdAt)) {
      items.push({ kind: 'date', key: `date-${dayKey(m.createdAt)}`, label: formatDateSeparator(m.createdAt) });
    }
  }
  return items;
};
