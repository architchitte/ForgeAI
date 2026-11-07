import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  fetchScreenshot,
  removeScreenshot,
  saveScreenshot,
} from '../services/screenshots';
import { PickedScreenshot, ProjectScreenshot, ScreenshotType } from '../types/screenshot';

interface MutationResult {
  error: string | null;
  warning: string | null;
}

interface UseProjectScreenshotResult {
  screenshot: ProjectScreenshot | null;
  loading: boolean;
  /** True while an upload / replace / remove is in flight. */
  busy: boolean;
  refresh: () => Promise<void>;
  save: (type: ScreenshotType, picked: PickedScreenshot) => Promise<MutationResult>;
  remove: () => Promise<MutationResult>;
}

/** Screenshot state for one project (detail page), with owner actions. */
export const useProjectScreenshot = (repositoryId: string): UseProjectScreenshotResult => {
  const { user } = useAuth();
  const [screenshot, setScreenshot] = useState<ProjectScreenshot | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [busy, setBusy] = useState<boolean>(false);
  const busyRef = useRef(false);
  const screenshotRef = useRef(screenshot);
  screenshotRef.current = screenshot;
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    const result = await fetchScreenshot(repositoryId);
    if (!mounted.current) return;
    // A load failure (e.g. table not created yet) just means "no screenshot".
    if (!result.error) setScreenshot(result.data);
    setLoading(false);
  }, [repositoryId]);

  useEffect(() => {
    setLoading(true);
    setScreenshot(null);
    refresh();
  }, [refresh]);

  const run = useCallback(
    async (op: () => Promise<MutationResult>): Promise<MutationResult> => {
      if (busyRef.current) return { error: 'Please wait for the current upload to finish.', warning: null };
      busyRef.current = true;
      setBusy(true);
      try {
        return await op();
      } finally {
        busyRef.current = false;
        if (mounted.current) setBusy(false);
      }
    },
    []
  );

  const save = useCallback(
    (type: ScreenshotType, picked: PickedScreenshot) =>
      run(async () => {
        if (!user?.id) return { error: 'You need to be signed in to do that.', warning: null };
        const result = await saveScreenshot({
          repositoryId,
          userId: user.id,
          picked,
          type,
          existing: screenshotRef.current,
        });
        if (result.error || !result.data) {
          // The row may have changed elsewhere — resync before the next try.
          await refresh();
          return { error: result.error || 'Failed to save screenshot.', warning: null };
        }
        if (mounted.current) setScreenshot(result.data.screenshot);
        return { error: null, warning: result.data.cleanupWarning };
      }),
    [run, repositoryId, user?.id, refresh]
  );

  const remove = useCallback(
    () =>
      run(async () => {
        const current = screenshotRef.current;
        if (!current) return { error: null, warning: null };
        const result = await removeScreenshot(current);
        if (result.error || !result.data) {
          await refresh();
          return { error: result.error || 'Failed to remove screenshot.', warning: null };
        }
        if (mounted.current) setScreenshot(null);
        return { error: null, warning: result.data.cleanupWarning };
      }),
    [run, refresh]
  );

  return { screenshot, loading, busy, refresh, save, remove };
};
