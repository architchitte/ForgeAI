import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { subscribeToLikeChanges } from '../services/engagement';

// Bursts of like events collapse into one batched re-read.
const REFRESH_DEBOUNCE_MS = 800;

/**
 * Keeps feed like counts current while `enabled` (the feed is visible):
 * - realtime: any like insert/delete triggers a debounced `onRefresh`;
 * - foreground: returning to the app triggers `onRefresh`, covering events
 *   missed while the socket was asleep in the background.
 * The subscription and listener are removed when disabled or unmounted.
 */
export const useLikesLiveSync = (enabled: boolean, onRefresh: () => void): void => {
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  useEffect(() => {
    if (!enabled) return;

    let timer: ReturnType<typeof setTimeout> | null = null;
    const schedule = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        onRefreshRef.current();
      }, REFRESH_DEBOUNCE_MS);
    };

    const unsubscribe = subscribeToLikeChanges(schedule);

    let appState = AppState.currentState;
    const appStateSub = AppState.addEventListener('change', (next) => {
      if (appState !== 'active' && next === 'active') schedule();
      appState = next;
    });

    return () => {
      if (timer) clearTimeout(timer);
      unsubscribe();
      appStateSub.remove();
    };
  }, [enabled]);
};
