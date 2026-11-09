const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_MS = 24 * 60 * 60 * 1000;

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/** Calendar days between the date and today (0 = today, 1 = yesterday). */
const daysAgo = (d: Date, now = new Date()) =>
  Math.round((startOfDay(now) - startOfDay(d)) / DAY_MS);

/** Local calendar-day key, e.g. "2026-11-09". */
export const dayKey = (iso: string): string => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};

/** "9:41 AM" */
export const formatClockTime = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const h = d.getHours();
  const m = d.getMinutes();
  return `${h % 12 || 12}:${m < 10 ? '0' : ''}${m} ${h < 12 ? 'AM' : 'PM'}`;
};

/** Inbox timestamp: "9:41 AM", "Yesterday", "Tue", "Oct 12", "Oct 12, 2025". */
export const formatConversationTime = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const diff = daysAgo(d);
  if (diff <= 0) return formatClockTime(iso);
  if (diff === 1) return 'Yesterday';
  if (diff < 7) return WEEKDAYS[d.getDay()].slice(0, 3);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return `${MONTHS[d.getMonth()]} ${d.getDate()}${sameYear ? '' : `, ${d.getFullYear()}`}`;
};

/** Date separator: "Today", "Yesterday", "Monday", "Oct 12", "Oct 12, 2025". */
export const formatDateSeparator = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const diff = daysAgo(d);
  if (diff <= 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 7) return WEEKDAYS[d.getDay()];
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return `${MONTHS[d.getMonth()]} ${d.getDate()}${sameYear ? '' : `, ${d.getFullYear()}`}`;
};
