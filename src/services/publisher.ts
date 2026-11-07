import { supabase } from '../../lib/supabase';
import { RepositoryResponse } from './repositories';
import { PublisherProfile } from '../types/profile';

/**
 * Public profile of a project's publisher, resolved server-side by
 * public.get_project_publisher (projects are owned by email; the app never
 * looks up accounts itself). Returns public fields only — never an email
 * or account id.
 */
export const fetchPublisherProfile = async (
  repositoryId: string
): Promise<RepositoryResponse<PublisherProfile | null>> => {
  try {
    const { data, error } = await supabase.rpc('get_project_publisher', {
      repo_id: repositoryId,
    });
    if (error) {
      console.warn('[PublisherService] fetch error:', error.message);
      const notSetUp = error.code === 'PGRST202' || /could not find the function/i.test(error.message);
      return {
        data: null,
        error: notSetUp ? 'Publisher profiles are not set up yet.' : error.message,
      };
    }
    const profile = (data as PublisherProfile | null) ?? null;
    if (profile && !Array.isArray(profile.education)) profile.education = [];
    return { data: profile, error: null };
  } catch (err: any) {
    console.warn('[PublisherService] Unexpected error:', err);
    return { data: null, error: err?.message || 'Failed to load the publisher profile.' };
  }
};
