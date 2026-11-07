import { useEffect, useState } from 'react';
import { fetchProjectTechnologies, ProjectTechnology } from '../services/technologies';

/**
 * Technologies for one project (detail page). `technologies` stays undefined
 * while loading or if loading fails, so callers fall back to the legacy
 * framework text instead of showing an empty list.
 */
export const useProjectTechnologies = (repositoryId: string) => {
  const [technologies, setTechnologies] = useState<ProjectTechnology[] | undefined>(undefined);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setTechnologies(undefined);
    fetchProjectTechnologies(repositoryId).then((result) => {
      if (cancelled) return;
      if (!result.error && result.data) setTechnologies(result.data);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [repositoryId]);

  return { technologies, loading };
};
