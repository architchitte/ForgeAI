import { supabase } from '../../lib/supabase';
import { REPOSITORY_SUMMARY_COLUMNS, RepositoryResponse } from './repositories';
import { PublisherProfile } from '../types/profile';
import { RepositorySummary } from '../types/repository';

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

/**
 * Any user's public profile by account id (get_user_profile) — used to open
 * a follower's profile, including people with no projects. Public fields
 * plus their project ids only; never an email.
 */
export const fetchUserProfile = async (
  userId: string
): Promise<RepositoryResponse<PublisherProfile | null>> => {
  try {
    const { data, error } = await supabase.rpc('get_user_profile', { target: userId });
    if (error) {
      console.warn('[PublisherService] fetchUserProfile error:', error.message);
      const notSetUp = error.code === 'PGRST202' || /could not find the function/i.test(error.message);
      return { data: null, error: notSetUp ? 'Profiles are not set up yet.' : error.message };
    }
    const profile = (data as PublisherProfile | null) ?? null;
    if (profile) {
      if (!Array.isArray(profile.education)) profile.education = [];
      if (!Array.isArray(profile.project_ids)) profile.project_ids = [];
    }
    return { data: profile, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Failed to load the profile.' };
  }
};

/** Repositories by id (e.g. a user's projects from get_user_profile), newest first. */
export const fetchRepositoriesByIds = async (
  ids: string[]
): Promise<RepositoryResponse<RepositorySummary[]>> => {
  if (ids.length === 0) return { data: [], error: null };
  try {
    const { data, error } = await supabase
      .from('repositories')
      .select(REPOSITORY_SUMMARY_COLUMNS)
      .in('id', ids.slice(0, 100))
      .order('created_at', { ascending: false });
    if (error) return { data: null, error: error.message };
    return { data: (data || []) as RepositorySummary[], error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Failed to load projects.' };
  }
};
