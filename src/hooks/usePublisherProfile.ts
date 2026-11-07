import { useEffect, useMemo, useState } from 'react';
import { fetchPublisherProfile } from '../services/publisher';
import { PublisherProfile, sortEducation } from '../types/profile';

/**
 * A project's publisher profile (one RPC call). `profile` stays null while
 * loading or if it can't load, so callers show the project's own name and
 * college instead.
 */
export const usePublisherProfile = (repositoryId: string) => {
  const [profile, setProfile] = useState<PublisherProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setProfile(null);
    fetchPublisherProfile(repositoryId).then((res) => {
      if (cancelled) return;
      setProfile(res.data);
      setError(res.error);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [repositoryId]);

  const currentEducation = useMemo(
    () => sortEducation(profile?.education ?? [])[0] ?? null,
    [profile]
  );

  return { profile, currentEducation, loading, error };
};
