import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  createEducation,
  deleteEducation,
  fetchEducation,
  updateEducation,
} from '../services/education';
import { Education, EducationInput, sortEducation } from '../types/profile';

/** The signed-in user's education history, always in LinkedIn-style order. */
export const useEducation = () => {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [items, setItems] = useState<Education[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<boolean>(false);
  const busyRef = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    if (!userId) return;
    const res = await fetchEducation(userId);
    if (!mounted.current) return;
    if (res.data) setItems(res.data);
    setError(res.error);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    setLoading(true);
    refresh();
  }, [refresh]);

  const run = useCallback(async (op: () => Promise<string | null>) => {
    if (busyRef.current) return 'Please wait for the current change to finish.';
    busyRef.current = true;
    setBusy(true);
    try {
      return await op();
    } finally {
      busyRef.current = false;
      if (mounted.current) setBusy(false);
    }
  }, []);

  const add = useCallback(
    (input: EducationInput) =>
      run(async () => {
        if (!userId) return 'You need to be signed in.';
        const res = await createEducation(userId, input);
        if (res.error || !res.data) return res.error || 'Failed to add qualification.';
        const row = res.data;
        if (mounted.current) setItems((prev) => [...prev, row]);
        return null;
      }),
    [run, userId]
  );

  const update = useCallback(
    (id: string, input: EducationInput) =>
      run(async () => {
        if (!userId) return 'You need to be signed in.';
        const res = await updateEducation(userId, id, input);
        if (res.error || !res.data) {
          await refresh();
          return res.error || 'Failed to update qualification.';
        }
        const row = res.data;
        if (mounted.current) setItems((prev) => prev.map((e) => (e.id === id ? row : e)));
        return null;
      }),
    [run, userId, refresh]
  );

  const remove = useCallback(
    (id: string) =>
      run(async () => {
        if (!userId) return 'You need to be signed in.';
        const res = await deleteEducation(userId, id);
        if (res.error) {
          await refresh();
          return res.error;
        }
        if (mounted.current) setItems((prev) => prev.filter((e) => e.id !== id));
        return null;
      }),
    [run, userId, refresh]
  );

  const sorted = useMemo(() => sortEducation(items), [items]);
  return { items: sorted, loading, error, busy, refresh, add, update, remove };
};
