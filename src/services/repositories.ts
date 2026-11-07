import { supabase } from '../../lib/supabase';
import {
  Repository,
  RepositorySummary,
  CreateRepositoryInput,
  UpdateRepositoryInput,
} from '../types/repository';

export interface RepositoryResponse<T> {
  data: T | null;
  error: string | null;
}

/**
 * Columns for list views — no system_prompt (the long project description),
 * which is fetched on demand by fetchRepositoryById. (repositories.user_id
 * does not exist in the database, so it is not requested.)
 */
export const REPOSITORY_SUMMARY_COLUMNS =
  'id, app_name, one_liner, framework, student_name, student_email, university, created_at, agent_execution_url';

export const FEED_PAGE_SIZE = 20;

/**
 * One page of repository summaries, newest first (rows offset..offset+limit-1).
 */
export const fetchRepositories = async (
  offset = 0,
  limit = FEED_PAGE_SIZE
): Promise<RepositoryResponse<RepositorySummary[]>> => {
  try {
    const { data, error } = await supabase
      .from('repositories')
      .select(REPOSITORY_SUMMARY_COLUMNS)
      .order('created_at', { ascending: false })
      // id tiebreaker keeps page boundaries stable for equal timestamps.
      .order('id', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('[RepositoriesService] fetchRepositories error:', error.message);
      return { data: null, error: error.message };
    }

    return { data: (data as RepositorySummary[]) || [], error: null };
  } catch (err: any) {
    console.error('[RepositoriesService] Unexpected fetch error:', err);
    return {
      data: null,
      error: err?.message || 'Failed to fetch repositories due to an unexpected error.',
    };
  }
};

/** One full repository (including system_prompt), for the project page. */
export const fetchRepositoryById = async (
  id: string
): Promise<RepositoryResponse<Repository>> => {
  try {
    const { data, error } = await supabase.from('repositories').select('*').eq('id', id).maybeSingle();
    if (error) {
      console.error('[RepositoriesService] fetchRepositoryById error:', error.message);
      return { data: null, error: error.message };
    }
    if (!data) return { data: null, error: 'This project no longer exists.' };
    return { data: data as Repository, error: null };
  } catch (err: any) {
    console.error('[RepositoriesService] Unexpected fetchRepositoryById error:', err);
    return { data: null, error: err?.message || 'Failed to load the project.' };
  }
};

/** Upper bound for the search index (summaries only, no descriptions). */
const SEARCH_INDEX_LIMIT = 1000;
const SEARCH_CACHE_MS = 60_000;
let searchCache: { at: number; data: RepositorySummary[] } | null = null;

/**
 * All repository summaries for Search, cached in memory for a minute so
 * returning to the tab doesn't re-download them. `force` skips the cache
 * (pull-to-refresh).
 */
export const fetchRepositorySummariesCached = async (
  force = false
): Promise<RepositoryResponse<RepositorySummary[]>> => {
  if (!force && searchCache && Date.now() - searchCache.at < SEARCH_CACHE_MS) {
    return { data: searchCache.data, error: null };
  }
  const result = await fetchRepositories(0, SEARCH_INDEX_LIMIT);
  if (result.data) searchCache = { at: Date.now(), data: result.data };
  return result;
};

/** A user's projects as summaries (profiles, Activity) — no descriptions. */
export const fetchUserRepositorySummaries = async (
  email: string
): Promise<RepositoryResponse<RepositorySummary[]>> => {
  try {
    const { data, error } = await supabase
      .from('repositories')
      .select(REPOSITORY_SUMMARY_COLUMNS)
      .eq('student_email', email)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('[RepositoriesService] fetchUserRepositorySummaries error:', error.message);
      return { data: null, error: error.message };
    }
    return { data: (data as RepositorySummary[]) || [], error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Failed to fetch projects.' };
  }
};

/**
 * Retrieve blueprint repositories submitted by a specific student email.
 */
export const fetchUserRepositories = async (
  email: string
): Promise<RepositoryResponse<Repository[]>> => {
  try {
    const { data, error } = await supabase
      .from('repositories')
      .select('*')
      .eq('student_email', email)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[RepositoriesService] fetchUserRepositories error:', error.message);
      return { data: null, error: error.message };
    }

    return { data: (data as Repository[]) || [], error: null };
  } catch (err: any) {
    console.error('[RepositoriesService] Unexpected fetch error for user repos:', err);
    return {
      data: null,
      error: err?.message || 'Failed to fetch your projects.',
    };
  }
};

/**
 * Insert a new application blueprint into public.repositories.
 */
export const createRepository = async (
  input: CreateRepositoryInput
): Promise<RepositoryResponse<Repository>> => {
  try {
    const { data, error } = await supabase
      .from('repositories')
      .insert([
        {
          app_name: input.app_name,
          one_liner: input.one_liner,
          framework: input.framework,
          system_prompt: input.system_prompt,
          agent_execution_url: input.agent_execution_url,
          student_email: input.student_email,
          student_name: input.student_name ?? null,
          university: input.university ?? null,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('[RepositoriesService] createRepository error:', error.message);
      return { data: null, error: error.message };
    }

    return { data: data as Repository, error: null };
  } catch (err: any) {
    console.error('[RepositoriesService] Unexpected insert error:', err);
    return {
      data: null,
      error: err?.message || 'Failed to publish blueprint due to an unexpected error.',
    };
  }
};

/**
 * Update an existing application blueprint in public.repositories.
 */
export const updateRepository = async (
  id: string,
  input: UpdateRepositoryInput
): Promise<RepositoryResponse<Repository>> => {
  try {
    const { data, error } = await supabase
      .from('repositories')
      .update({
        ...(input.app_name !== undefined ? { app_name: input.app_name } : {}),
        ...(input.one_liner !== undefined ? { one_liner: input.one_liner } : {}),
        ...(input.framework !== undefined ? { framework: input.framework } : {}),
        ...(input.system_prompt !== undefined ? { system_prompt: input.system_prompt } : {}),
        ...(input.agent_execution_url !== undefined ? { agent_execution_url: input.agent_execution_url } : {}),
        ...(input.student_name !== undefined ? { student_name: input.student_name } : {}),
        ...(input.university !== undefined ? { university: input.university } : {}),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[RepositoriesService] updateRepository error:', error.message);
      return { data: null, error: error.message };
    }

    return { data: data as Repository, error: null };
  } catch (err: any) {
    console.error('[RepositoriesService] Unexpected update error:', err);
    return {
      data: null,
      error: err?.message || 'Failed to update blueprint due to an unexpected error.',
    };
  }
};

/**
 * Delete an existing application blueprint from public.repositories.
 */
export const deleteRepository = async (
  id: string
): Promise<RepositoryResponse<boolean>> => {
  try {
    const { error } = await supabase
      .from('repositories')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[RepositoriesService] deleteRepository error:', error.message);
      return { data: false, error: error.message };
    }

    return { data: true, error: null };
  } catch (err: any) {
    console.error('[RepositoriesService] Unexpected delete error:', err);
    return {
      data: false,
      error: err?.message || 'Failed to delete blueprint due to an unexpected error.',
    };
  }
};
